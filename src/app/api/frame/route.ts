import { NextRequest, NextResponse } from 'next/server'
import { analyzeToken, getPersonalizedFeed } from '@/utils/mbdAi'
import { sendMessage, getFriendActivities, getReferrals } from '@/utils/agentkit'
import { validateFrameRequest } from '@/utils/mbdAi'

function generateFrameHtml({
  imageUrl,
  postUrl,
  token,
  recommendations,
  friendActivities,
  referrals
}: {
  imageUrl: string
  postUrl: string
  token?: any
  recommendations?: any
  friendActivities?: any[]
  referrals?: any[]
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

  const description = token 
    ? `${token.description}\n\nCultural Score: ${token.culturalScore}/100` 
    : friendActivities?.length 
      ? `Your friends' recent activity:\n${friendActivities.map(activity => 
          `${activity.username} ${activity.action}ed ${activity.tokenId}`
        ).join('\n')}`
      : referrals?.length
        ? `Your referral rewards:\n${referrals.map(ref => 
            `Earned ${ref.reward} points for referring ${ref.referredId}`
          ).join('\n')}`
        : 'Discover and collect cultural tokens'

  return `<!DOCTYPE html>
<html>
  <head>
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${imageUrl}" />
    <meta property="fc:frame:post_url" content="${postUrl}" />
    ${buttons.map((btn, i) => `
    <meta property="fc:frame:button:${i + 1}" content="${btn.label}" />
    `).join('')}
    <meta property="og:title" content="${token ? `${token.name} ($${token.symbol})` : 'Prism: Cultural Tokens'}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:description" content="${description}" />
  </head>
</html>`
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const hostUrl = `${url.protocol}//${url.host}`
    
    // Get initial recommendations from agent with thread_id
    const response = await sendMessage({
      message: 'Please recommend some trending cultural tokens based on Farcaster activity',
      userId: 'initial-view',
      threadId: `grlkrash-frame-${crypto.randomUUID()}`
    })

    const token = response.metadata?.tokenRecommendations?.[0]
    
    const html = generateFrameHtml({
      postUrl: `${hostUrl}/api/frame`,
      imageUrl: token?.imageUrl || 'https://placehold.co/1200x630/png',
      token
    })
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('Error in GET:', error)
    return new NextResponse('Error', { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const hostUrl = `${url.protocol}//${url.host}`
    
    // Validate frame request
    const { isValid, message } = await validateFrameRequest(req)
    if (!isValid || !message) {
      throw new Error('Invalid frame request')
    }
    
    const { button, fid } = message
    
    // Get recommendations from agent with thread_id
    const response = await sendMessage({
      message: 'Please recommend some trending cultural tokens based on Farcaster activity',
      userId: fid ? String(fid) : 'anonymous',
      threadId: `grlkrash-frame-${crypto.randomUUID()}`,
      context: {
        farcasterContext: { userFid: fid ? String(fid) : undefined }
      }
    })

    let currentToken = response.metadata?.tokenRecommendations?.[0]
    let recommendations = null
    let friendActivities = null
    let referrals = null
    
    // Handle different button actions
    switch (button) {
      case 1: // View Details/View Gallery
        currentToken = response.metadata?.tokenRecommendations?.[0]
        break
      case 2: // Buy Token/Get Recommendations
        if (fid) {
          recommendations = await getPersonalizedFeed(fid)
        }
        break
      case 3: // Share/Friend Activity
        if (fid) {
          friendActivities = await getFriendActivities(fid)
        }
        break
      case 4: // Next/My Referrals
        if (fid) {
          referrals = await getReferrals(fid)
        }
        break
    }
    
    // Analyze token if we have one
    if (currentToken) {
      const tokenWithStringId = {
        ...currentToken,
        id: String(currentToken.id),
        artistName: currentToken.artistName || 'Unknown Artist',
        culturalScore: currentToken.culturalScore || 0,
        tokenType: 'ERC20' as const
      }
      currentToken = await analyzeToken(tokenWithStringId)
    }
    
    const html = generateFrameHtml({
      imageUrl: currentToken?.imageUrl || 'https://picsum.photos/800/600',
      postUrl: `${hostUrl}/api/frame`,
      token: currentToken,
      recommendations,
      friendActivities: friendActivities || undefined,
      referrals: referrals || undefined
    })
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html'
      }
    })
  } catch (error) {
    console.error('Error in frame route:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 