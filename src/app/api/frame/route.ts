import { NextRequest } from 'next/server'
import { logger } from '@/utils/logger'
import { sendMessage, getFriendActivities, getReferrals } from '@/utils/agentkit'
import { analyzeToken, tokenDatabase } from '@/utils/mbdAi'
import { validateFrameRequest } from '@/utils/frame'
import { getTokenMentions, type FarcasterCast, calculateCulturalScore } from '@/utils/farcaster'
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

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

function generateFrameHtml({
  imageUrl = 'https://placehold.co/1200x630/png',
  postUrl,
  token,
  recommendations = [],
  errorMessage
}: {
  imageUrl?: string
  postUrl: string
  token?: any
  recommendations?: any[]
  errorMessage?: string
}) {
  const buttons = token ? [
    { text: `View ${token.symbol || 'Token'}`, action: 'view' },
    { text: `Buy (${token.price || 'N/A'} ETH)`, action: 'buy' },
    { text: `Share ${token.aiAnalysis?.category || 'Token'}`, action: 'share' },
    { text: 'Next', action: 'next' }
  ] : [
    { text: 'Discover', action: 'discover' },
    { text: 'Popular', action: 'popular' },
    { text: 'New', action: 'new' },
    { text: 'Refresh', action: 'refresh' }
  ]

  const title = token ? 
    `${token.name || 'Unknown Token'} (${token.symbol || 'N/A'}) - Score: ${(token.aiAnalysis?.aiScore || 0).toFixed(2)}` : 
    'Prism: Cultural Tokens'

  const description = errorMessage || (token ? 
    `${token.description || 'No description available'}\n\n` +
    `Category: ${token.aiAnalysis?.category || 'Unknown'}\n` +
    `Cultural Score: ${(token.aiAnalysis?.aiScore || 0).toFixed(2)}\n` +
    `Social: ${token.reactions?.likes || 0} likes, ${token.reactions?.recasts || 0} recasts\n` +
    `${token.aiAnalysis?.gptAnalysis ? '\nAnalysis: ' + token.aiAnalysis.gptAnalysis : ''}\n\n` +
    `Price: ${token.price || 'N/A'} ETH` : 
    'Discover cultural tokens in art')

  return `<!DOCTYPE html>
<html>
  <head>
    <title>${title}</title>
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${imageUrl}" />
    <meta property="fc:frame:post_url" content="${postUrl}" />
    ${buttons.map((btn, i) => `<meta property="fc:frame:button:${i + 1}" content="${btn.text}" />`).join('\n    ')}
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
      token: initialToken,
      imageUrl: initialToken.imageUrl || 'https://placehold.co/1200x630/png'
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
    
    // 2. Get token mentions from Farcaster
    let tokenMentions: FarcasterCast[]
    try {
      tokenMentions = await getTokenMentions('art', 10)
    } catch (error) {
      logger.error('Failed to fetch token mentions:', error)
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
    
    // Select a random token from mentions
    const selectedCast = tokenMentions[Math.floor(Math.random() * tokenMentions.length)]
    
    if (!selectedCast) {
      return new Response(
        generateFrameHtml({
          postUrl: req.url,
          errorMessage: 'No cultural tokens found'
        }),
        {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store'
          }
        }
      )
    }

    // Extract token symbol from cast text
    const tokenSymbol = selectedCast.text.match(/\$([A-Z]+)/)?.[1] || 'ART'
    
    // 3. Analyze token with OpenAI
    let aiAnalysis: string
    let category: string
    try {
      const analysis = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in cultural tokens and art. Analyze the given content and provide insights about its cultural significance.'
          },
          {
            role: 'user',
            content: `Analyze this token mention: ${selectedCast.text}\n\nProvide a brief analysis of its cultural significance and categorize it (e.g., Art, Music, Film, etc).`
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      })

      aiAnalysis = analysis.choices[0].message.content || ''
      category = aiAnalysis.match(/Category:\s*([^\.]+)/i)?.[1] || 'Art'
    } catch (error) {
      logger.error('Failed to analyze token with OpenAI:', error)
      aiAnalysis = 'Analysis unavailable'
      category = 'Art'
    }
    
    // 4. Construct token object and return response
    const token = {
      name: `${category} Token`,
      symbol: tokenSymbol,
      description: selectedCast.text,
      price: '0.001',
      reactions: selectedCast.reactions,
      aiAnalysis: {
        category,
        aiScore: calculateCulturalScore(selectedCast),
        gptAnalysis: aiAnalysis
      }
    }

    return new Response(
      generateFrameHtml({
        postUrl: req.url,
        token,
        imageUrl: selectedCast.author.pfp || 'https://placehold.co/1200x630/png'
      }),
      {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store'
        }
      }
    )

  } catch (error) {
    logger.error('[ERROR] Frame request failed:', error)
    return new Response(
      generateFrameHtml({
        postUrl: req.url,
        errorMessage: 'Failed to process request'
      }),
      {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store'
        }
      }
    )
  }
} 