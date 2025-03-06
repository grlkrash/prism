import { NextRequest } from 'next/server'
import { logger } from '@/utils/logger'
import { sendMessage, getFriendActivities, getReferrals } from '@/utils/agentkit'
import { analyzeToken, getPersonalizedFeed, type Cast, tokenDatabase } from '@/utils/mbdAi'
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
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    const validation = await hubResponse.json()
    if (!validation.valid || !validation.message) {
      return new Response('Invalid frame message', { status: 400 })
    }

    // Extract data from validated message
    const { frameActionBody } = validation.message.data
    const { buttonIndex, inputText } = frameActionBody
    const fid = validation.message.data.fid
    
    // Get recommendations from both AI agent and MBD AI
    const [agentResults, mbdResults] = await Promise.allSettled([
      FEATURE_FLAGS.ENABLE_AGENT_CHAT 
        ? sendMessage({
            message: 'Recommend cultural tokens for discovery',
            userId: fid.toString(),
            context: { view: 'feed' }
          })
        : Promise.resolve(null),
      getPersonalizedFeed(fid.toString())
    ])

    let combinedTokens = []

    // Process AI agent results
    if (FEATURE_FLAGS.ENABLE_AGENT_CHAT && agentResults.status === 'fulfilled' && agentResults.value?.recommendations) {
      combinedTokens.push(...agentResults.value.recommendations)
    }

    // Process MBD AI results
    if (mbdResults.status === 'fulfilled' && mbdResults.value?.data?.casts) {
      const enhancedCasts = await Promise.all(
        mbdResults.value.data.casts.map(async (cast: MbdCast) => {
          try {
            const analysis = await openai.chat.completions.create({
              model: "gpt-4",
              messages: [
                {
                  role: "system",
                  content: "You are an expert in analyzing cultural tokens and art content."
                },
                {
                  role: "user",
                  content: `Analyze this content for cultural significance: ${cast.text}`
                }
              ],
              temperature: 0.7,
              max_tokens: 150
            })

            return {
              ...cast,
              aiAnalysis: {
                ...cast.aiAnalysis,
                gptAnalysis: analysis.choices[0]?.message?.content || ''
              }
            }
          } catch (error) {
            logger.error('Error analyzing cast with GPT:', error)
            return cast
          }
        })
      )

      combinedTokens.push(...enhancedCasts)
    }

    // Generate frame response
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Cultural Token Discovery</title>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="https://example.com/token-gallery.png" />
          <meta property="fc:frame:button:1" content="View More" />
          <meta property="fc:frame:button:2" content="Get Recommendations" />
          <meta property="fc:frame:post_url" content="${process.env.NEXT_PUBLIC_APP_URL}/api/frame" />
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
    logger.error('Error in frame route:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    )
  }
} 