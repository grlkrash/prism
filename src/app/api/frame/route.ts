import { NextRequest } from 'next/server'
import { logger } from '@/utils/logger'
import { sendMessage, getFriendActivities, getReferrals } from '@/utils/agentkit'
import { analyzeToken, getPersonalizedFeed, getTrendingFeed, type Cast, validateFrameRequest } from '@/utils/mbdAi'
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
  recommendations,
  friendActivities,
  referrals,
  errorMessage
}: {
  imageUrl?: string
  postUrl: string
  token?: TokenItem
  recommendations?: TokenItem[]
  friendActivities?: any[]
  referrals?: any[]
  errorMessage?: string
}) {
  const buttons = token ? [
    { label: 'View Details', action: 'view' },
    { label: 'Buy Token', action: 'buy' },
    { label: 'Share', action: 'share' },
    { label: 'Next', action: 'next' }
  ] : [
    { label: 'View Gallery', action: 'gallery' },
    { label: 'Get Recommendations', action: 'recommend' },
    { label: 'Friend Activity', action: 'friends' },
    { label: 'My Referrals', action: 'referrals' }
  ]

  const description = errorMessage 
    ? errorMessage
    : token 
      ? `${token.description || 'No description available'}\n\nPrice: ${token.price} ETH` 
      : friendActivities?.length 
        ? `Your friends' recent activity:\n${friendActivities.map(activity => 
            `${activity.username || 'Someone'} ${activity.action || 'interacted with'}ed ${activity.tokenId || 'a token'}`
          ).join('\n')}`
        : referrals?.length
          ? `Your referral rewards:\n${referrals.map(ref => 
              `Earned ${ref.reward || '0'} points for referring ${ref.referredId || 'someone'}`
            ).join('\n')}`
          : 'Discover and collect cultural tokens'

  return `<!DOCTYPE html>
<html>
  <head>
    <title>Prism Frame</title>
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${imageUrl}" />
    <meta property="fc:frame:post_url" content="${postUrl}" />
    ${buttons.map((btn, i) => `
    <meta property="fc:frame:button:${i + 1}" content="${btn.label}" />
    `).join('')}
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:title" content="${token ? `${token.name || 'Unknown Token'} (${token.symbol || 'N/A'})` : 'Prism: Cultural Tokens'}" />
    <meta property="og:description" content="${description}" />
  </head>
  <body>
    <h1>Prism Frame</h1>
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
        `<!DOCTYPE html><html><head>
          <title>Error</title>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${process.env.NEXT_PUBLIC_HOST_URL}/error.png" />
          <meta property="fc:frame:button:1" content="Try Again" />
        </head></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    const fid = message?.fid
    const buttonIndex = message?.button || 1
    const url = new URL(req.url)
    const hostUrl = `${url.protocol}//${url.host}`

    // Get recommendations based on user context
    const response = await sendMessage({
      message: fid 
        ? 'Please recommend personalized art and cultural tokens based on user preferences'
        : 'Please analyze trending art and cultural tokens on Farcaster',
      userId: fid || 'anonymous',
      threadId: `grlkrash-frame-${randomUUID()}`,
      context: fid ? {
        farcasterContext: { userFid: fid }
      } : undefined
    })

    let currentToken = response.metadata?.tokenRecommendations?.[0]
    let recommendations: TokenItem[] | undefined = undefined
    let friendActivities: any[] | undefined = undefined
    let referrals: any[] | undefined = undefined
    let errorMessage: string | undefined
    
    // Handle different button actions
    switch (buttonIndex) {
      case 1: // View Details/View Gallery
        currentToken = response.metadata?.tokenRecommendations?.[0]
        break
      case 2: // Buy Token/Get Recommendations
        if (fid) {
          const feedResponse = await getPersonalizedFeed(fid)
          if (feedResponse?.casts) {
            recommendations = feedResponse.casts.map((cast: Cast) => ({
              id: cast.hash,
              name: cast.author.username,
              symbol: 'TOKEN',
              description: cast.text,
              price: 0,
              image: cast.author.pfp,
              imageUrl: cast.author.pfp,
              artistName: cast.author.displayName,
              culturalScore: cast.reactions.likes,
              tokenType: 'ERC20' as const,
              metadata: {
                artistName: cast.author.displayName,
                culturalScore: cast.reactions.likes,
                tokenType: 'ERC20',
                timestamp: Number(cast.timestamp),
                likes: cast.reactions.likes,
                recasts: cast.reactions.recasts,
                contractAddress: process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS as string
              }
            }))
          }
        } else {
          errorMessage = '🔒 Sign in with Farcaster to get personalized recommendations'
        }
        break
      case 3: // Share/Friend Activity
        if (fid) {
          const activities = await getFriendActivities(fid)
          friendActivities = activities || undefined
        } else {
          errorMessage = '🔒 Sign in with Farcaster to see friend activity'
        }
        break
      case 4: // Next/My Referrals
        if (fid) {
          const userReferrals = await getReferrals(fid)
          referrals = userReferrals || undefined
        } else {
          errorMessage = '🔒 Sign in with Farcaster to view your referrals'
        }
        break
    }

    // Analyze token if we have one
    if (currentToken) {
      // Convert TokenItem to Token for analysis
      const tokenForAnalysis = {
        id: currentToken.id,
        name: currentToken.name,
        symbol: currentToken.symbol,
        description: currentToken.description,
        imageUrl: currentToken.imageUrl || currentToken.image || 'https://picsum.photos/800/600',
        artistName: currentToken.artistName || 'Unknown Artist',
        price: String(currentToken.price || 0),
        culturalScore: currentToken.culturalScore || 0,
        tokenType: 'ERC20' as const
      }

      const analyzedToken = await analyzeToken(tokenForAnalysis)
      
      // Convert analyzed Token back to TokenItem
      currentToken = {
        ...currentToken,
        id: String(analyzedToken.id),
        name: analyzedToken.name,
        symbol: analyzedToken.symbol,
        description: analyzedToken.description,
        imageUrl: analyzedToken.imageUrl,
        image: analyzedToken.imageUrl,
        artistName: analyzedToken.artistName,
        price: parseFloat(analyzedToken.price),
        culturalScore: analyzedToken.culturalScore,
        tokenType: analyzedToken.tokenType,
        metadata: {
          ...currentToken.metadata,
          artistName: analyzedToken.artistName,
          culturalScore: analyzedToken.culturalScore,
          tokenType: analyzedToken.tokenType,
          contractAddress: process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS as string
        }
      }
    }

    // Format frame response based on content
    let imageUrl = currentToken?.imageUrl || `${hostUrl}/placeholder.png`
    let buttonText1 = 'View Gallery'
    let buttonText2 = fid ? 'Get Recommendations' : 'Sign in'
    let buttonText3 = fid ? 'Friend Activity' : 'Sign in'
    let buttonText4 = fid ? 'My Referrals' : 'Sign in'

    return new Response(
      `<!DOCTYPE html><html><head>
        <title>Prism Frame</title>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${imageUrl}" />
        <meta property="fc:frame:button:1" content="${buttonText1}" />
        <meta property="fc:frame:button:2" content="${buttonText2}" />
        <meta property="fc:frame:button:3" content="${buttonText3}" />
        <meta property="fc:frame:button:4" content="${buttonText4}" />
        ${errorMessage ? `<meta property="fc:frame:state" content="${errorMessage}" />` : ''}
      </head></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (error) {
    logger.error('Frame error:', error)
    const url = new URL(req.url)
    const hostUrl = `${url.protocol}//${url.host}`
    return new Response(
      `<!DOCTYPE html><html><head>
        <title>Error</title>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${hostUrl}/error.png" />
        <meta property="fc:frame:button:1" content="Try Again" />
      </head></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
} 