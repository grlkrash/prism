import { NextRequest } from 'next/server'
import { logger } from '@/utils/logger'
import { sendMessage, getFriendActivities, getReferrals } from '@/utils/agentkit'
import { analyzeToken, getPersonalizedFeed, getTrendingFeed, type Cast, tokenDatabase } from '@/utils/mbdAi'
import { MBD_AI_CONFIG } from '@/config/mbdAi'
import sdk from '@farcaster/frame-sdk'
import { OpenAI } from 'openai'
import { randomUUID } from 'crypto'
import type { TokenItem } from '@/types/token'

// Types for MBD AI responses
interface MbdCast {
  hash: string
  text: string
  author: {
    fid: number
    username: string
    pfp?: string
  }
  aiAnalysis?: {
    hasCulturalElements?: boolean
    category?: string
    aiScore?: number
  }
  metadata?: {
    timestamp: number
  }
}

interface MbdApiResponse {
  casts?: MbdCast[]
  next?: {
    cursor?: string
  }
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
    { text: 'View Details', action: 'view' },
    { text: 'Buy Token', action: 'buy' },
    { text: 'Share', action: 'share' },
    { text: 'Next', action: 'next' }
  ] : [
    { text: 'Discover', action: 'discover' },
    { text: 'Popular', action: 'popular' },
    { text: 'New', action: 'new' },
    { text: 'Refresh', action: 'refresh' }
  ]

  const title = token ? `${token.name || 'Unknown Token'} (${token.symbol || 'N/A'})` : 'Prism: Cultural Tokens'
  const description = errorMessage || (token ? 
    `${token.description || 'No description available'}\n\nPrice: ${token.price || 'N/A'} ETH` : 
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
    const body = await req.json()
    
    // Validate frame message using Hub API
    const hubResponse = await fetch(`${process.env.NEXT_PUBLIC_FARCASTER_HUB_URL}/v1/validateMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      body: JSON.stringify(body)
    })

    const validation = await hubResponse.json()
    if (!validation.valid || !validation.message) {
      return new Response('Invalid frame message', { status: 400 })
    }

    const { frameActionBody } = validation.message.data
    const { buttonIndex, inputText } = frameActionBody
    const fid = validation.message.data.fid
    
    // Process recommendations in parallel
    const [agentResults, mbdResults] = await Promise.allSettled([
      // 1. Get recommendations from AI agent
      sendMessage({
        message: 'Please recommend cultural tokens focusing on art and creative content',
        userId: fid.toString(),
        context: {
          buttonIndex,
          inputText
        }
      }),

      // 2. Get personalized feed from MBD AI
      getPersonalizedFeed(fid) as Promise<MbdApiResponse>
    ])

    let combinedTokens: TokenItem[] = []

    // Process AI agent results
    if (agentResults.status === 'fulfilled' && agentResults.value?.metadata?.tokenRecommendations) {
      combinedTokens.push(...agentResults.value.metadata.tokenRecommendations)
    }

    // Process MBD AI results
    if (mbdResults.status === 'fulfilled' && mbdResults.value?.casts) {
      const culturalTokens = mbdResults.value.casts.filter((cast: MbdCast) => 
        cast.aiAnalysis?.hasCulturalElements || 
        cast.aiAnalysis?.category?.toLowerCase().includes('art')
      )
      
      // Convert MBD casts to tokens
      const mbdTokens = await Promise.all(culturalTokens.map(async (cast: MbdCast) => {
        const token: TokenItem = {
          id: cast.hash,
          name: cast.text.split('\n')[0] || 'Untitled',
          symbol: cast.text.match(/\$([A-Z]+)/)?.[1] || 'TOKEN',
          description: cast.text,
          price: 0.001,
          image: cast.author.pfp || '',
          category: cast.aiAnalysis?.category || 'cultural',
          metadata: {
            authorFid: String(cast.author.fid),
            timestamp: cast.metadata?.timestamp || Date.now(),
            culturalScore: cast.aiAnalysis?.aiScore || 0
          }
        }

        // Enhance with GPT-4 analysis
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [{
              role: "system",
              content: "You are an expert in cultural tokens and digital art. Analyze this token's cultural significance."
            }, {
              role: "user",
              content: `Token: ${JSON.stringify(token)}`
            }],
            temperature: 0.7,
            max_tokens: 150
          })

          return {
            ...token,
            description: completion.choices[0]?.message?.content || token.description,
            metadata: {
              ...token.metadata,
              aiEnhanced: true,
              culturalScore: completion.choices[0]?.message?.content?.includes('cultural') ? 
                (token.metadata?.culturalScore || 0) + 0.5 : 
                token.metadata?.culturalScore || 0
            }
          }
        } catch (error) {
          logger.error('GPT-4 enhancement failed:', error)
          return token
        }
      }))

      combinedTokens.push(...mbdTokens)
    }

    // Remove duplicates and sort by cultural score
    const uniqueTokens = Array.from(
      new Map(combinedTokens.map(token => [token.id, token])).values()
    ).sort((a, b) => 
      (b.metadata?.culturalScore || 0) - (a.metadata?.culturalScore || 0)
    )

    // Get current token based on button index
    const currentToken = uniqueTokens[buttonIndex - 1] || uniqueTokens[0]

    // Generate frame response with post URL
    const url = new URL(req.url)
    const baseUrl = `${url.protocol}//${url.host}`
    const postUrl = `${baseUrl}/api/frame`

    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Cultural Token Discovery</title>
          <meta property="og:title" content="${currentToken.name}" />
          <meta property="og:description" content="${currentToken.description}" />
          <meta property="og:image" content="${currentToken.image}" />
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${currentToken.image}" />
          <meta property="fc:frame:post_url" content="${postUrl}" />
          <meta property="fc:frame:button:1" content="Previous" />
          <meta property="fc:frame:button:2" content="Details" />
          <meta property="fc:frame:button:3" content="Next" />
          <meta property="fc:frame:button:4" content="Share" />
        </head>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    )
  } catch (error) {
    logger.error('Frame route error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
} 