import { NextRequest } from 'next/server'
import { logger } from '@/utils/logger'
import { sendMessage } from '@/utils/agentkit'
import { analyzeToken, getPersonalizedFeed, type Cast, tokenDatabase } from '@/utils/mbdAi'

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
    
    // Basic validation of request body
    if (!body || !body.untrustedData) {
      logger.error('Invalid frame request: Missing or invalid request body')
      return new Response(generateFrameHtml({
        postUrl: req.url,
        errorMessage: 'Invalid request format'
      }), {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const { untrustedData } = body
    const buttonIndex = Number(untrustedData.buttonIndex) || 1
    const fid = untrustedData.fid || 'anonymous'

    // Initialize recommendations array
    let recommendations = []
    let currentToken = null

    try {
      // First try to get agent recommendations
      const agentResponse = await sendMessage({
        message: 'Show me cultural tokens in art category',
        userId: fid,
        context: { button: buttonIndex }
      })

      logger.info('Agent response received:', agentResponse?.metadata?.tokenRecommendations?.length)

      if (agentResponse?.metadata?.tokenRecommendations) {
        recommendations = agentResponse.metadata.tokenRecommendations
      }
    } catch (agentError) {
      logger.error('Agent error:', agentError)
    }

    // If no agent recommendations, use mock data
    if (recommendations.length === 0) {
      logger.info('Using mock data')
      recommendations = tokenDatabase.map(token => ({
        ...token,
        imageUrl: token.imageUrl || 'https://placehold.co/1200x630/png'
      }))
    }

    // Get current token based on button index
    const currentIndex = (buttonIndex - 1) % recommendations.length
    currentToken = recommendations[currentIndex]

    if (!currentToken) {
      currentToken = tokenDatabase[0]
    }

    logger.info('Returning frame with token:', currentToken.name)

    return new Response(generateFrameHtml({
      postUrl: req.url,
      token: currentToken,
      recommendations,
      imageUrl: currentToken.imageUrl || 'https://placehold.co/1200x630/png'
    }), {
      headers: { 'Content-Type': 'text/html' }
    })
  } catch (error) {
    logger.error('Error in POST:', error)
    // Return first mock token on error
    const fallbackToken = tokenDatabase[0]
    return new Response(generateFrameHtml({
      postUrl: req.url,
      token: fallbackToken,
      imageUrl: fallbackToken.imageUrl || 'https://placehold.co/1200x630/png'
    }), {
      headers: { 'Content-Type': 'text/html' }
    })
  }
} 