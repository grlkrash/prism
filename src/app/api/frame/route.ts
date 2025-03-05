import { NextRequest } from 'next/server'
import { logger } from '@/utils/logger'
import { sendMessage, getFriendActivities, getReferrals } from '@/utils/agentkit'
import { analyzeToken, getPersonalizedFeed, getTrendingFeed, type Cast } from '@/utils/mbdAi'
import { randomUUID } from 'crypto'
import type { TokenItem } from '@/types/token'
import { OpenAI } from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Convert token data to OpenAI-friendly format
async function convertTokenForAI(token: TokenItem) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{
        role: "system",
        content: "You are an expert in cultural tokens and digital art. Convert the given token data into a natural description."
      }, {
        role: "user",
        content: `Please analyze this token: ${JSON.stringify(token)}`
      }],
      temperature: 0.7,
      max_tokens: 150
    })

    return {
      ...token,
      aiDescription: completion.choices[0]?.message?.content || token.description,
      aiAnalysis: {
        sentiment: completion.choices[0]?.message?.content?.includes('positive') ? 1 : 0,
        culturalRelevance: completion.choices[0]?.message?.content?.includes('cultural') ? 1 : 0
      }
    }
  } catch (error) {
    logger.error('Error in AI conversion:', error)
    return token
  }
}

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
    <title>Prism Frame</title>
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${imageUrl}" />
    <meta property="fc:frame:post_url" content="${postUrl}" />
    ${buttons.map((btn, i) => `<meta property="fc:frame:button:${i + 1}" content="${btn.text}" />`).join('\n    ')}
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
  </head>
  <body>
    <h1>${title}</h1>
    <p>${description}</p>
  </body>
</html>`
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const hostUrl = `${url.protocol}//${url.host}`
    
    // Return initial frame HTML
    return new Response(generateFrameHtml({
      postUrl: `${hostUrl}/api/frame`,
      imageUrl: 'https://placehold.co/1200x630/png'
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
    const validation = await validateFrameRequest(req)
    if (!validation.isValid) {
      return new Response(generateFrameHtml({
        postUrl: new URL('/api/frame', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').toString(),
        errorMessage: 'Invalid frame request'
      }), {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const { message } = validation
    
    // Get recommendations from both agent and MBD AI
    const [agentResponse, mbdResponse] = await Promise.all([
      sendMessage({
        message: 'Show me cultural tokens in art category',
        userId: message?.fid || 'anonymous',
        context: { button: message?.button }
      }),
      getPersonalizedFeed()
    ])

    // Combine recommendations
    const recommendations = [
      ...(agentResponse.metadata?.tokenRecommendations || []),
      ...(mbdResponse?.data?.casts || [])
        .filter((cast: Cast) => cast.aiAnalysis?.hasCulturalElements)
        .map((cast: Cast) => ({
          id: cast.hash,
          name: cast.text.slice(0, 50),
          symbol: 'CULT',
          description: cast.text,
          imageUrl: 'https://placehold.co/1200x630/png',
          culturalScore: cast.metadata?.culturalScore || cast.aiAnalysis?.aiScore || 0
        }))
    ]

    // If no recommendations, return error message
    if (recommendations.length === 0) {
      return new Response(generateFrameHtml({
        postUrl: new URL('/api/frame', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').toString(),
        errorMessage: 'No cultural tokens found at the moment'
      }), {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Get the current token based on button index
    const currentIndex = ((message?.button || 1) - 1) % recommendations.length
    const currentToken = recommendations[currentIndex]

    return new Response(generateFrameHtml({
      postUrl: new URL('/api/frame', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').toString(),
      recommendations,
      token: currentToken,
      imageUrl: currentToken.imageUrl
    }), {
      headers: { 'Content-Type': 'text/html' }
    })
  } catch (error) {
    logger.error('Error in frame POST:', error)
    return new Response(generateFrameHtml({
      postUrl: new URL('/api/frame', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').toString(),
      errorMessage: 'An error occurred processing your request'
    }), {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}

interface FrameMessage {
  button: number
  fid?: string
}

async function validateFrameRequest(req: NextRequest): Promise<{ isValid: boolean, message?: FrameMessage }> {
  try {
    // Always return test data in development
    if (process.env.NODE_ENV === 'development') {
      return {
        isValid: true,
        message: {
          button: 1,
          fid: 'test-user-123'
        }
      }
    }

    const body = await req.json()
    
    // Basic validation of request body
    if (!body || typeof body !== 'object') {
      logger.error('Invalid frame request: Missing or invalid request body')
      return { isValid: false }
    }

    const { untrustedData, trustedData } = body

    // Validate required fields
    if (!untrustedData || typeof untrustedData !== 'object') {
      logger.error('Invalid frame request: Missing untrustedData')
      return { isValid: false }
    }

    // Extract button index and fid with defaults
    const buttonIndex = Number(untrustedData.buttonIndex) || 1
    const fid = untrustedData.fid || 'anonymous'

    // Validate button index
    if (buttonIndex < 1 || buttonIndex > 4) {
      logger.error('Invalid frame request: Invalid button index')
      return { isValid: false }
    }

    // For production, validate messageBytes
    if (process.env.NODE_ENV === 'production' && (!trustedData?.messageBytes)) {
      logger.error('Invalid frame request: Missing messageBytes in production')
      return { isValid: false }
    }

    return {
      isValid: true,
      message: {
        button: buttonIndex,
        fid: fid.toString()
      }
    }
  } catch (error) {
    logger.error('Frame validation error:', error)
    return { isValid: false }
  }
} 