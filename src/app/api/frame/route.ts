import { NextRequest } from 'next/server'
import { logger } from '@/utils/logger'
import { sendMessage, getFriendActivities, getReferrals } from '@/utils/agentkit'
import { analyzeToken, tokenDatabase, calculateCulturalScore } from '@/utils/mbdAi'
import { validateFrameRequest } from '@/utils/frame'
import { getTokenMentions, type FarcasterCast } from '@/utils/farcaster'
import { MBD_AI_CONFIG } from '@/config/mbdAi'
import { OpenAI } from 'openai'
import { randomUUID } from 'crypto'
import type { TokenItem } from '@/types/token'
import { FEATURE_FLAGS } from '@/utils/feature-flags'

// Types for MBD AI responses
interface MbdCast {
  hash: string
  text: string
  author: {
    fid: number
    username: string
    pfp?: string
  }
  reactions: {
    likes: number
    recasts: number
  }
  timestamp: string
  aiAnalysis?: {
    hasCulturalElements?: boolean
    category?: string
    aiScore?: number
  }
}

interface FeedResponse {
  casts: MbdCast[]
  next?: {
    cursor?: string
  }
}

interface MbdApiResponse<T> {
  data: T
  status: number
  success: boolean
}

interface FrameState {
  cursor?: string
  tokens: TokenItem[]
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

function generateFrameHtml({ postUrl, errorMessage, tokenData, nextCursor }: {
  postUrl: string
  errorMessage?: string
  tokenData?: {
    symbol: string
    category: string
    analysis: string
    price: string
    culturalScore: number
    social: {
      likes: number
      recasts: number
    }
  }
  nextCursor?: string
}) {
  const title = errorMessage 
    ? 'Prism: Cultural Tokens'
    : `${tokenData?.category || 'Art'}\n\n#### Analysis of Cultural Significance:\n\n1 Token (${tokenData?.symbol || 'ART'}) - Score: ${tokenData?.culturalScore?.toFixed(2) || '0.00'}`

  const description = errorMessage 
    ? errorMessage
    : `${tokenData?.analysis || 'No analysis available'}\n\nPrice: ${tokenData?.price || '0.001 ETH'}`

  const imageUrl = 'https://placehold.co/1200x630/png'

  return `
<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${imageUrl}" />
    <meta property="fc:frame:post_url" content="${postUrl}" />
    <meta property="fc:frame:button:1" content="View ${tokenData?.symbol || 'ART'}" />
    <meta property="fc:frame:button:2" content="Buy (${tokenData?.price || '0.001 ETH'})" />
    <meta property="fc:frame:button:3" content="Share ${tokenData?.symbol || 'ART'}" />
    <meta property="fc:frame:state" content="${JSON.stringify({ cursor: nextCursor })}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
  </head>
</html>`
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const baseUrl = `${url.protocol}//${url.host}`
    const postUrl = `${baseUrl}/api/frame`

    // Use first mock token for initial view
    const initialToken = tokenDatabase[0]
    
    return new Response(generateFrameHtml({
      postUrl,
      tokenData: {
        symbol: initialToken.symbol || 'ART',
        category: initialToken.aiAnalysis?.category || 'Art',
        analysis: initialToken.aiAnalysis?.gptAnalysis || 'No analysis available',
        price: initialToken.price || '0.001',
        culturalScore: calculateCulturalScore(initialToken),
        social: initialToken.reactions || { likes: 0, recasts: 0 }
      }
    }), {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    logger.error('Error in GET:', error)
    return new Response(generateFrameHtml({
      postUrl: req.url,
      errorMessage: 'Something went wrong. Please try again later.'
    }), {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Validate frame request
    const validationResult = await validateFrameRequest(req)
    if (!validationResult.isValid || !validationResult.message) {
      return new Response(
        generateFrameHtml({
          postUrl: req.url,
          errorMessage: validationResult.error || 'Invalid frame request'
        }),
        {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store'
          }
        }
      )
    }

    const { button, fid } = validationResult.message
    
    // 2. Get token mentions from Farcaster with cursor for infinite scroll
    let tokenMentions: FarcasterCast[]
    let nextCursor: string | undefined
    try {
      logger.info('[Frame] Fetching token mentions for art')
      tokenMentions = await getTokenMentions('art', Number(fid))
      logger.info('[Frame] Successfully fetched token mentions:', {
        count: tokenMentions?.length || 0,
        mentions: tokenMentions?.map(cast => ({
          text: cast.text,
          timestamp: new Date(cast.timestamp).toISOString(),
          reactions: cast.reactions
        }))
      })

      if (!tokenMentions?.length) {
        logger.info('[Frame] No token mentions found, using default cast')
        const defaultCast: FarcasterCast = {
          hash: '0xdefault',
          threadHash: '0xdefault',
          parentHash: '0xdefault',
          author: {
            fid: Number(process.env.FARCASTER_FID) || 6841,
            username: 'deodad',
            displayName: 'Tony D\'Addeo',
            pfp: 'https://i.imgur.com/dMoIan7.jpg'
          },
          text: 'Check out this amazing art piece! $ART',
          timestamp: Date.now(),
          reactions: { likes: 100, recasts: 50 }
        }
        tokenMentions = [defaultCast]
        logger.info('[Frame] Using default cast:', {
          hash: defaultCast.hash,
          text: defaultCast.text,
          author: defaultCast.author.username,
          timestamp: new Date(defaultCast.timestamp).toISOString()
        })
      }

      // Calculate cultural scores for all casts
      tokenMentions = tokenMentions.map(cast => ({
        ...cast,
        culturalScore: calculateCulturalScore({
          id: cast.hash,
          name: cast.text,
          symbol: cast.text.match(/\$([A-Za-z0-9]+)/)?.[1]?.toUpperCase() || 'ART',
          description: cast.text,
          imageUrl: 'https://placehold.co/1200x630/png',
          artistName: cast.author.displayName,
          price: '0.001 ETH',
          culturalScore: 0,
          tokenType: 'ERC20',
          metadata: {
            category: 'Art',
            tags: ['art', 'culture'],
            sentiment: 0.5,
            popularity: (cast.reactions.likes + cast.reactions.recasts) / 1000,
            aiScore: 0.5,
            isCulturalToken: true,
            artStyle: 'Digital',
            culturalContext: cast.text
          }
        })
      }))
    } catch (error) {
      logger.error('[Frame] Failed to fetch token mentions:', error)
      logger.error('[Frame] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown error type'
      })
      return new Response(
        generateFrameHtml({
          postUrl: req.url,
          errorMessage: 'Failed to fetch cultural tokens'
        }),
        {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store'
          }
        }
      )
    }

    // 3. Process all token mentions with OpenAI
    const processedTokens = await Promise.all(
      tokenMentions.map(async (cast) => {
        const tokenSymbol = cast.text.match(/\$([A-Za-z0-9]+)/)?.[1]?.toUpperCase() || 'ART'
        
        try {
          // Use the agent's analysis instead of direct OpenAI calls
          const analysis = await analyzeToken(tokenSymbol)
          
          return {
            ...cast,
            aiAnalysis: {
              category: analysis.metadata?.category || 'Art',
              tags: analysis.metadata?.tags || ['art', 'culture'],
              sentiment: analysis.metadata?.sentiment || 0.5,
              popularity: analysis.metadata?.popularity || (cast.reactions.likes + cast.reactions.recasts) / 1000,
              aiScore: analysis.metadata?.aiScore || 0.5,
              isCulturalToken: analysis.metadata?.isCulturalToken || true,
              artStyle: analysis.metadata?.artStyle || 'Digital',
              culturalContext: analysis.metadata?.culturalContext || cast.text
            }
          }
        } catch (error) {
          logger.error(`Failed to analyze token ${tokenSymbol}:`, error)
          return {
            ...cast,
            aiAnalysis: {
              category: 'Art',
              tags: ['art', 'culture'],
              sentiment: 0.5,
              popularity: (cast.reactions.likes + cast.reactions.recasts) / 1000,
              aiScore: 0.5,
              isCulturalToken: true,
              artStyle: 'Digital',
              culturalContext: cast.text
            }
          }
        }
      })
    )

    // 4. Return response with all processed tokens and cursor
    return new Response(
      generateFrameHtml({
        postUrl: req.url,
        tokenData: processedTokens[0], // Use first token for frame display
        nextCursor // Include cursor for infinite scroll
      }),
      {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store'
        }
      }
    )
  } catch (error) {
    logger.error('Error in POST:', error)
    return new Response(
      generateFrameHtml({
        postUrl: req.url,
        errorMessage: 'Something went wrong. Please try again later.'
      }),
      {
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
} 