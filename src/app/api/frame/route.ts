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
    const { isValid, message } = await validateFrameRequest(req)

    if (!isValid) {
      return new Response(
        generateFrameHtml({
          postUrl: `${process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:3007'}/api/frame`,
          imageUrl: `${process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:3007'}/error.png`,
          errorMessage: 'Invalid frame request'
        }),
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    const fid = message?.fid
    const buttonIndex = message?.button || 1

    // Get recommendations based on user context
    const response = await sendMessage({
      message: 'Show me cultural tokens in art category',
      userId: fid || 'anonymous',
      threadId: `grlkrash-frame-${randomUUID()}`,
      context: {
        category: 'art',
        buttonIndex
      }
    })

    // Extract token recommendations from response
    const recommendations = response?.metadata?.tokenRecommendations || []
    const currentToken = recommendations[0]

    // If no recommendations, show default view
    if (!currentToken) {
      return new Response(
        generateFrameHtml({
          postUrl: `${process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:3007'}/api/frame`,
          imageUrl: `${process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:3007'}/placeholder.png`,
          errorMessage: 'No recommendations available. Try again!'
        }),
        { headers: { 'Content-Type': 'text/html' } }
      )
    }
    
    // Format frame response based on content
    return new Response(
      generateFrameHtml({
        postUrl: `${process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:3007'}/api/frame`,
        imageUrl: currentToken.imageUrl || `${process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:3007'}/placeholder.png`,
        token: currentToken,
        recommendations
      }),
      { headers: { 'Content-Type': 'text/html' } }
    )

  } catch (error) {
    console.error('Frame error:', error)
    return new Response(
      generateFrameHtml({
        postUrl: `${process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:3007'}/api/frame`,
        imageUrl: `${process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:3007'}/error.png`,
        errorMessage: 'Something went wrong. Please try again.'
      }),
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}

interface FrameMessage {
  button: number
  fid?: string
}

async function validateFrameRequest(req: NextRequest): Promise<{ isValid: boolean, message?: FrameMessage }> {
  try {
    const body = await req.json()
    
    // Basic frame message validation
    if (!body || !body.untrustedData) {
      return { isValid: false }
    }

    const { untrustedData } = body
    
    // Validate required fields
    if (!untrustedData.fid || !untrustedData.messageHash) {
      return { isValid: false }
    }

    // In development, always return valid
    if (process.env.NODE_ENV === 'development') {
      return { 
        isValid: true,
        message: body
      }
    }

    // In production, do additional validation if needed
    // For now, we'll just do basic validation
    return {
      isValid: true,
      message: body
    }
  } catch (error) {
    console.error('[ERROR] Frame validation error:', error)
    return { isValid: false }
  }
} 