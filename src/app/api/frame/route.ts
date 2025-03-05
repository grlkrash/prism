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

    let recommendations = []
    let currentToken = null
    let mbdAiResults = []

    // 1. Try AI Agent first
    try {
      logger.info('Fetching AI agent recommendations...')
      const agentResponse = await sendMessage({
        message: 'Show me cultural tokens in art category',
        userId: fid,
        context: { button: buttonIndex }
      })

      if (agentResponse?.metadata?.tokenRecommendations?.length > 0) {
        logger.info('AI agent recommendations received:', agentResponse.metadata.tokenRecommendations.length)
        recommendations = agentResponse.metadata.tokenRecommendations
      }
    } catch (agentError) {
      logger.error('AI agent error:', agentError)
    }

    // 2. Try MBD AI if agent recommendations are empty
    if (recommendations.length === 0) {
      try {
        logger.info('Fetching MBD AI recommendations...')
        const feed = await getPersonalizedFeed(fid)
        
        if (feed?.casts) {
          const culturalCasts = feed.casts.filter(cast => 
            cast.aiAnalysis?.hasCulturalElements || 
            cast.aiAnalysis?.category?.toLowerCase().includes('art') ||
            cast.aiAnalysis?.category?.toLowerCase().includes('culture')
          )

          if (culturalCasts.length > 0) {
            logger.info('MBD AI recommendations received:', culturalCasts.length)
            mbdAiResults = await Promise.all(
              culturalCasts.map(async cast => {
                const analysis = await analyzeToken(cast)
                return {
                  id: cast.hash,
                  name: cast.text.split('\n')[0] || 'Untitled Token',
                  symbol: cast.text.match(/\$([A-Z]+)/)?.[1] || 'TOKEN',
                  description: cast.text,
                  imageUrl: cast.author.pfp || 'https://placehold.co/1200x630/png',
                  price: '0.001 ETH',
                  culturalScore: analysis?.culturalScore || 0,
                  tokenType: 'ERC20',
                  metadata: {
                    ...cast.metadata,
                    aiScore: analysis?.aiScore || 0,
                    isCulturalToken: true
                  }
                }
              })
            )
            recommendations = mbdAiResults
          }
        }
      } catch (mbdError) {
        logger.error('MBD AI error:', mbdError)
      }
    }

    // 3. Use mock data only if both API calls fail
    if (recommendations.length === 0) {
      logger.info('Using mock data as fallback')
      recommendations = tokenDatabase
    }

    // Get current token based on button index
    const currentIndex = (buttonIndex - 1) % recommendations.length
    currentToken = recommendations[currentIndex]

    if (!currentToken) {
      logger.error('No token found for index:', currentIndex)
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
    return new Response(generateFrameHtml({
      postUrl: req.url,
      token: tokenDatabase[0],
      errorMessage: 'An error occurred. Please try again.'
    }), {
      headers: { 'Content-Type': 'text/html' }
    })
  }
} 