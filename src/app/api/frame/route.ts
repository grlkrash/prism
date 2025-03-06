import { NextRequest } from 'next/server'
import { logger } from '@/utils/logger'
import { sendMessage, getFriendActivities, getReferrals } from '@/utils/agentkit'
import { analyzeToken, getPersonalizedFeed, type Cast, tokenDatabase, validateFrameRequest } from '@/utils/mbdAi'
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
    const { isValid, message } = await validateFrameRequest(req)
    
    if (!isValid || !message) {
      logger.error('Invalid frame message')
      return new Response(generateFrameHtml({
        postUrl: req.url,
        errorMessage: 'Invalid frame message'
      }), {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Extract data from validated message
    const { button: buttonIndex } = message
    const fid = message.fid
    const buttonActions = ['discover', 'popular', 'new', 'refresh', 'view', 'buy', 'share', 'next']
    const selectedAction = buttonActions[buttonIndex - 1] || 'discover'
    
    // Get recommendations from both AI agent and MBD AI
    const [agentResults, mbdResults] = await Promise.allSettled([
      FEATURE_FLAGS.ENABLE_AGENT_CHAT 
        ? sendMessage({
            message: 'Recommend cultural tokens for discovery',
            userId: fid?.toString() || 'anonymous',
            context: { 
              view: 'feed',
              action: selectedAction
            }
          }).catch(error => {
            logger.error('Agent chat error:', error)
            return null
          })
        : Promise.reject('Agent chat disabled'),
      getPersonalizedFeed().catch(error => {
        logger.error('Feed error:', error)
        return null
      })
    ])

    let combinedTokens = []

    // Process AI agent results
    if (FEATURE_FLAGS.ENABLE_AGENT_CHAT && agentResults.status === 'fulfilled' && agentResults.value?.recommendations) {
      combinedTokens.push(...agentResults.value.recommendations.map(rec => ({
        hash: rec.symbol,
        text: rec.description,
        name: rec.name,
        symbol: rec.symbol,
        description: rec.description,
        price: '0.001', // Example price, should be fetched from price feed
        author: {
          fid: 1,
          username: rec.name,
          pfp: undefined
        },
        reactions: { likes: 0, recasts: 0 },
        timestamp: new Date().toISOString(),
        aiAnalysis: {
          category: rec.category,
          aiScore: rec.culturalScore,
          hasCulturalElements: true,
          tags: rec.tags
        }
      })))
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
                  content: "You are an expert in analyzing cultural tokens and art content. Provide a brief, engaging analysis focusing on cultural and artistic significance."
                },
                {
                  role: "user",
                  content: `Analyze this content for cultural significance: ${cast.text}`
                }
              ],
              temperature: 0.7,
              max_tokens: 150
            })

            // Extract token details from cast text
            const tokenMatch = cast.text.match(/\$([A-Z]+)/)
            const symbol = tokenMatch ? tokenMatch[1] : 'TOKEN'
            
            return {
              ...cast,
              name: cast.author.username || 'Unknown Token',
              symbol,
              description: cast.text,
              price: '0.001', // Example price, should be fetched from price feed
              aiAnalysis: {
                ...cast.aiAnalysis,
                gptAnalysis: analysis.choices[0]?.message?.content || '',
                tags: analysis.choices[0]?.message?.content
                  ?.toLowerCase()
                  .match(/#\w+/g)
                  ?.map(tag => tag.slice(1)) || []
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

    // Sort tokens by AI score and social engagement
    combinedTokens.sort((a, b) => {
      const scoreA = (a.aiAnalysis?.aiScore || 0) * 0.7 + 
        ((a.reactions?.likes || 0) + (a.reactions?.recasts || 0) * 2) * 0.3
      const scoreB = (b.aiAnalysis?.aiScore || 0) * 0.7 + 
        ((b.reactions?.likes || 0) + (b.reactions?.recasts || 0) * 2) * 0.3
      return scoreB - scoreA
    })

    // Handle button actions
    let selectedToken
    let currentIndex = 0

    switch (selectedAction) {
      case 'discover':
        selectedToken = combinedTokens[0]
        break
      case 'popular':
        selectedToken = combinedTokens.sort((a, b) => 
          ((b.reactions?.likes || 0) + (b.reactions?.recasts || 0)) - 
          ((a.reactions?.likes || 0) + (a.reactions?.recasts || 0))
        )[0]
        break
      case 'new':
        selectedToken = combinedTokens.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0]
        break
      case 'next':
        // Get current token from state or use first token
        const currentHash = message.inputText // Assuming we store current hash in inputText
        currentIndex = currentHash ? 
          combinedTokens.findIndex(t => t.hash === currentHash) : -1
        selectedToken = combinedTokens[(currentIndex + 1) % combinedTokens.length] || combinedTokens[0]
        break
      default:
        selectedToken = combinedTokens[0]
    }

    // Use fallback token if no recommendations available
    if (!selectedToken) {
      selectedToken = tokenDatabase[0]
    }

    // Generate frame response
    return new Response(
      generateFrameHtml({
        postUrl: process.env.NEXT_PUBLIC_APP_URL + '/api/frame',
        token: selectedToken,
        imageUrl: 'selectedToken' in selectedToken && selectedToken.imageUrl ? 
          selectedToken.imageUrl : 
          selectedToken.author?.pfp || 'https://placehold.co/1200x630/png',
        recommendations: combinedTokens,
        errorMessage: combinedTokens.length === 0 ? 'No recommendations available' : undefined
      }),
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
      generateFrameHtml({
        postUrl: req.url,
        errorMessage: 'Something went wrong. Please try again later.',
        imageUrl: 'https://placehold.co/1200x630/png?text=Error'
      }), 
      {
        headers: { 'Content-Type': 'text/html' }
      }
    )
  }
} 