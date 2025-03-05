import { NextRequest, NextResponse } from 'next/server'
import { analyzeToken, getPersonalizedFeed } from '@/utils/mbdAi'
import { sendMessage } from '@/utils/agentkit'
import { validateFrameRequest } from '@/utils/mbdAi'

function generateFrameHtml({
  imageUrl,
  postUrl,
  token,
  recommendations
}: {
  imageUrl: string
  postUrl: string
  token?: any
  recommendations?: any
}) {
  const buttons = token ? [
    { label: 'View Details', action: 'view' },
    { label: 'Buy Token', action: 'buy' },
    { label: 'Share', action: 'share' },
    { label: 'Next', action: 'next' }
  ] : [
    { label: 'View Gallery', action: 'gallery' },
    { label: 'Get Recommendations', action: 'recommend' }
  ]

  return `<!DOCTYPE html>
<html>
  <head>
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${imageUrl}" />
    <meta property="fc:frame:post_url" content="${postUrl}" />
    ${buttons.map((btn, i) => `
    <meta property="fc:frame:button:${i + 1}" content="${btn.label}" />
    `).join('')}
    <meta property="og:title" content="${token ? token.name : 'Prism: Cultural Tokens'}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:description" content="${token ? token.description : 'Discover and collect cultural tokens'}" />
  </head>
</html>`
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const hostUrl = `${url.protocol}//${url.host}`
    
    // Get initial recommendations from agent
    const response = await sendMessage({
      message: 'Please recommend some trending cultural tokens based on Farcaster activity',
      userId: 'initial-view'
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
    
    // Get recommendations from agent
    const response = await sendMessage({
      message: 'Please recommend some trending cultural tokens based on Farcaster activity',
      userId: fid ? String(fid) : 'anonymous',
      context: {
        farcasterContext: { userFid: fid ? String(fid) : undefined }
      }
    })

    let currentToken = response.metadata?.tokenRecommendations?.[0]
    let recommendations = null
    
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
      case 3: // Share
        // Handle share action
        break
      case 4: // Next
        // Get next token from recommendations
        currentToken = response.metadata?.tokenRecommendations?.[1]
        break
    }
    
    // Analyze token if we have one
    if (currentToken) {
      currentToken = await analyzeToken(currentToken)
    }
    
    const html = generateFrameHtml({
      postUrl: `${hostUrl}/api/frame`,
      imageUrl: currentToken?.imageUrl || 'https://placehold.co/1200x630/png',
      token: currentToken,
      recommendations
    })
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('Error in POST:', error)
    return new NextResponse('Error', { status: 500 })
  }
} 