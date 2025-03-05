import { NextRequest, NextResponse } from 'next/server'
import { analyzeToken, getPersonalizedFeed } from '@/utils/mbdAi'
import { sendMessage, getFriendActivities, getReferrals } from '@/utils/agentkit'
import { validateFrameRequest } from '@/utils/mbdAi'
import { randomUUID } from 'crypto'
import type { TokenItem } from '@/types/token'

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
  recommendations?: any
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
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${imageUrl}" />
    <meta property="fc:frame:post_url" content="${postUrl}" />
    ${buttons.map((btn, i) => `
    <meta property="fc:frame:button:${i + 1}" content="${btn.label}" />
    `).join('')}
    <meta property="og:title" content="${token ? `${token.name || 'Unknown Token'} (${token.symbol || 'N/A'})` : 'Prism: Cultural Tokens'}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:description" content="${description}" />
  </head>
</html>`
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const hostUrl = `${url.protocol}//${url.host}`
    
    // Get initial trending cultural tokens
    const response = await sendMessage({
      message: 'Please analyze trending art and cultural tokens on Farcaster',
      userId: 'anonymous',
      threadId: `grlkrash-frame-${randomUUID()}`
    })

    const token = response.metadata?.tokenRecommendations?.[0]
    
    const html = generateFrameHtml({
      postUrl: `${hostUrl}/api/frame`,
      imageUrl: token?.image,
      token,
    })
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('Error in GET:', error)
    return new NextResponse(generateFrameHtml({
      postUrl: req.url,
      errorMessage: 'Something went wrong. Please try again later.'
    }), {
      headers: { 'Content-Type': 'text/html' }
    })
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
    
    // Get recommendations based on user context
    const response = await sendMessage({
      message: fid 
        ? 'Please recommend personalized art and cultural tokens based on user preferences'
        : 'Please analyze trending art and cultural tokens on Farcaster',
      userId: fid ? String(fid) : 'anonymous',
      threadId: `grlkrash-frame-${randomUUID()}`,
      context: fid ? {
        farcasterContext: { userFid: String(fid) }
      } : undefined
    })

    let currentToken = response.metadata?.tokenRecommendations?.[0]
    let recommendations = null
    let friendActivities: any[] | undefined = undefined
    let referrals: any[] | undefined = undefined
    let errorMessage: string | undefined
    
    // Handle different button actions
    switch (button) {
      case 1: // View Details/View Gallery
        currentToken = response.metadata?.tokenRecommendations?.[0]
        break
      case 2: // Buy Token/Get Recommendations
        if (fid) {
          recommendations = await getPersonalizedFeed(fid)
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
      const tokenWithId = {
        ...currentToken,
        id: String(currentToken.id || '0'),
        metadata: {
          artistName: 'Unknown Artist',
          culturalScore: 0,
          tokenType: 'ERC20'
        }
      }
      currentToken = await analyzeToken(tokenWithId)
    }
    
    const html = generateFrameHtml({
      imageUrl: currentToken?.image || 'https://picsum.photos/800/600',
      postUrl: `${hostUrl}/api/frame`,
      token: currentToken,
      recommendations,
      friendActivities,
      referrals,
      errorMessage
    })
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html'
      }
    })
  } catch (error) {
    console.error('Error in frame route:', error)
    return new NextResponse(generateFrameHtml({
      postUrl: req.url,
      errorMessage: 'Something went wrong. Please try again later.'
    }), {
      headers: { 'Content-Type': 'text/html' }
    })
  }
} 