import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/utils/logger'
import { sendMessage, getFriendActivities, getReferrals } from '@/utils/agentkit'
import { analyzeToken, getPersonalizedFeed, getTrendingFeed, type Cast, tokenDatabase } from '@/utils/mbdAi'
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
    const body = await req.json()
    
    // Validate frame request
    const validationResult = await validateFrameRequest({
      ...body,
      skipMessageBytesValidation: process.env.NODE_ENV !== 'production'
    })

    if (!validationResult.isValid) {
      console.error('[ERROR] Frame validation failed:', validationResult.message)
      return new Response(generateFrameHtml({
        postUrl: new URL('/api/frame', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').toString(),
        errorMessage: 'Invalid frame request'
      }), {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const { message } = validationResult
    const recommendations = []
    
    try {
      // Get recommendations from agent first
      const agentResponse = await sendMessage({
        message: 'Show me cultural tokens in art category',
        userId: message?.fid || 'anonymous',
        context: { button: message?.button }
      })

      logger.info('Agent response:', agentResponse)

      // Add agent recommendations if available
      if (agentResponse?.metadata?.tokenRecommendations) {
        recommendations.push(...agentResponse.metadata.tokenRecommendations)
        logger.info('Added agent recommendations:', recommendations.length)
      }

      // Try to get MBD AI recommendations
      try {
        const mbdResponse = await getPersonalizedFeed()
        if (mbdResponse?.data?.casts) {
          const culturalCasts = mbdResponse.data.casts
            .filter((cast: Cast) => cast.aiAnalysis?.hasCulturalElements)
            .map((cast: Cast) => ({
              id: cast.hash,
              name: cast.text.slice(0, 50),
              symbol: 'CULT',
              description: cast.text,
              imageUrl: 'https://placehold.co/1200x630/png',
              culturalScore: cast.metadata?.culturalScore || cast.aiAnalysis?.aiScore || 0
            }))
          recommendations.push(...culturalCasts)
          logger.info('Added MBD AI recommendations:', culturalCasts.length)
        }
      } catch (mbdError) {
        logger.error('MBD AI error (continuing with agent recommendations):', mbdError)
      }

      // If still no recommendations, use mock data
      if (recommendations.length === 0) {
        logger.info('Using mock data as fallback')
        const mockTokens = tokenDatabase.map(token => ({
          ...token,
          imageUrl: 'https://placehold.co/1200x630/png'
        }))
        recommendations.push(...mockTokens)
      }

      // Get the current token based on button index
      const currentIndex = ((message?.button || 1) - 1) % recommendations.length
      const currentToken = recommendations[currentIndex]

      logger.info('Returning frame with token:', currentToken?.name)

      return new Response(generateFrameHtml({
        postUrl: new URL('/api/frame', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').toString(),
        recommendations,
        token: currentToken,
        imageUrl: currentToken.imageUrl
      }), {
        headers: { 'Content-Type': 'text/html' }
      })
    } catch (agentError) {
      logger.error('Error in agent processing:', agentError)
      // Return mock data if agent fails
      const mockTokens = tokenDatabase.map(token => ({
        ...token,
        imageUrl: 'https://placehold.co/1200x630/png'
      }))
      const currentToken = mockTokens[0]

      return new Response(generateFrameHtml({
        postUrl: new URL('/api/frame', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').toString(),
        recommendations: mockTokens,
        token: currentToken,
        imageUrl: currentToken.imageUrl
      }), {
        headers: { 'Content-Type': 'text/html' }
      })
    }
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
    
    // Basic validation of request body according to Frames v2 spec
    if (!body || typeof body !== 'object') {
      logger.error('Invalid frame request: Missing or invalid request body')
      return { isValid: false }
    }

    const { untrustedData, trustedData } = body

    // Validate required fields per Frames v2 spec
    if (!untrustedData || typeof untrustedData !== 'object') {
      logger.error('Invalid frame request: Missing untrustedData')
      return { isValid: false }
    }

    // Extract and validate button index (must be 1-4 per spec)
    const buttonIndex = Number(untrustedData.buttonIndex) || 1
    const fid = untrustedData.fid || 'anonymous'

    if (buttonIndex < 1 || buttonIndex > 4) {
      logger.error('Invalid frame request: Invalid button index')
      return { isValid: false }
    }

    // For production, validate messageBytes using Warpcast Hub API
    if (process.env.NODE_ENV === 'production' && trustedData?.messageBytes) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_FARCASTER_HUB_URL}/v1/validateMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Authorization': `Bearer ${process.env.FARCASTER_API_KEY}`
          },
          body: trustedData.messageBytes
        })

        if (!response.ok) {
          logger.error('Invalid frame request: Hub validation failed')
          return { isValid: false }
        }

        const result = await response.json()
        if (!result.valid) {
          logger.error('Invalid frame request: Message validation failed')
          return { isValid: false }
        }
      } catch (error) {
        logger.error('Error validating frame message:', error)
        return { isValid: false }
      }
    }

    return {
      isValid: true,
      message: {
        button: buttonIndex,
        fid
      }
    }
  } catch (error) {
    logger.error('Error validating frame request:', error)
    return { isValid: false }
  }
} 