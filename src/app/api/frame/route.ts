import { NextRequest, NextResponse } from 'next/server'
import { tokenDatabase } from '../../../utils/mbdAi'

function generateFrameHtml({
  imageUrl,
  postUrl,
  title,
  description,
  buttons = [
    { label: 'Previous', action: 'previous' },
    { label: 'Next', action: 'next' },
    { label: 'Collect', action: 'collect' },
    { label: 'Ask Agent', action: 'ask' }
  ]
}) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${imageUrl}" />
  <meta property="fc:frame:post_url" content="${postUrl}" />
  <meta property="fc:frame:button:1" content="Previous" />
  <meta property="fc:frame:button:2" content="Next" />
  <meta property="fc:frame:button:3" content="Collect" />
  <meta property="fc:frame:button:4" content="Ask Agent" />
</head>
<body>
  <h1>${title}</h1>
  <p>${description}</p>
</body>
</html>`.trim()
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const hostUrl = `${url.protocol}//${url.host}`
    console.log('Host URL:', hostUrl)
    
    const token = tokenDatabase[0]
    // Use a reliable placeholder image
    const imageUrl = 'https://placehold.co/800x600/png'
    
    const html = generateFrameHtml({
      postUrl: `${hostUrl}/api/frame`,
      imageUrl,
      title: token.name,
      description: `${token.description} by ${token.artistName}`
    })
    
    console.log('Generated HTML:', html)
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('Error in GET:', error)
    return new NextResponse('Error generating frame', { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const url = new URL(req.url)
    const hostUrl = `${url.protocol}//${url.host}`
    
    // Handle button clicks
    let currentTokenIndex = 0
    const buttonIndex = body?.untrustedData?.buttonIndex || 0

    switch (buttonIndex) {
      case 1: // Previous
        currentTokenIndex = Math.max(0, currentTokenIndex - 1)
        break
      case 2: // Next
        currentTokenIndex = Math.min(tokenDatabase.length - 1, currentTokenIndex + 1)
        break
      case 3: // Collect
        const html = generateFrameHtml({
          postUrl: `${hostUrl}/api/frame`,
          imageUrl: 'https://placehold.co/800x600/png',
          title: 'Token Collected!',
          description: 'The token has been added to your collection.'
        })
        return new NextResponse(html, {
          headers: {
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*'
          }
        })
      case 4: // Ask Agent
        const agentHtml = generateFrameHtml({
          postUrl: `${hostUrl}/api/frame`,
          imageUrl: 'https://placehold.co/800x600/png',
          title: 'Opening Agent Chat',
          description: 'Connecting to the agent...'
        })
        return new NextResponse(agentHtml, {
          headers: {
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*'
          }
        })
    }

    const token = tokenDatabase[currentTokenIndex]
    const html = generateFrameHtml({
      postUrl: `${hostUrl}/api/frame`,
      imageUrl: 'https://placehold.co/800x600/png',
      title: token.name,
      description: `${token.description} by ${token.artistName}`
    })
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('Error in POST:', error)
    const errorHtml = generateFrameHtml({
      postUrl: `${new URL(req.url).origin}/api/frame`,
      imageUrl: 'https://placehold.co/800x600/png',
      title: 'Error',
      description: 'Something went wrong. Please try again.'
    })
    return new NextResponse(errorHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
} 