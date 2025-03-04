import { NextRequest, NextResponse } from 'next/server'
import getFrameMessage from '@farcaster/frame-sdk'

// Sample token data for the demo
const sampleTokens = [
  {
    id: '1',
    name: 'Digital Renaissance',
    artist: 'Metagallery',
    image: 'https://placehold.co/1200x628/5F4B8B/FFFFFF/png?text=Digital%20Renaissance', // 1.91:1 aspect ratio
    description: 'A community token celebrating digital art pioneers',
    curatorPoints: 125,
  }
]

function generateFrameHtml({
  imageUrl = 'https://placehold.co/1200x628/5F4B8B/FFFFFF/png?text=Digital%20Renaissance',
  postUrl,
  title = 'Digital Renaissance',
  description = 'A community token celebrating digital art pioneers by Metagallery'
}) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${imageUrl}" />
  <meta property="fc:frame:button:1" content="Previous" />
  <meta property="fc:frame:button:2" content="Next" />
  <meta property="fc:frame:button:3" content="Collect" />
  <meta property="fc:frame:button:4" content="Ask Agent" />
  <meta property="fc:frame:post_url" content="${postUrl}" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta property="og:title" content="Prism: ${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <title>Prism: ${title}</title>
</head>
<body>
  <h1>Prism: ${title}</h1>
  <p>${description}</p>
</body>
</html>`
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const hostUrl = `${url.protocol}//${url.host}`
    
    const html = generateFrameHtml({
      postUrl: `${hostUrl}/api/frame`,
      imageUrl: sampleTokens[0].image,
      title: sampleTokens[0].name,
      description: `${sampleTokens[0].description} by ${sampleTokens[0].artist}`
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
    console.error('Error in GET:', error)
    return new NextResponse('Error', { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { isValid, message } = await getFrameMessage(body)
    
    if (!isValid || !message) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid frame message' }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    const url = new URL(req.url)
    const hostUrl = `${url.protocol}//${url.host}`
    
    // Handle button clicks
    const buttonIndex = message.button
    let currentTokenIndex = 0 // In real app, store in KV or similar

    switch (buttonIndex) {
      case 1: // Previous
        currentTokenIndex = Math.max(0, currentTokenIndex - 1)
        break
      case 2: // Next
        currentTokenIndex = Math.min(sampleTokens.length - 1, currentTokenIndex + 1)
        break
      case 3: // Collect
        // TODO: Implement collection logic
        break
      case 4: // Ask Agent
        // TODO: Implement agent interaction
        break
    }

    const token = sampleTokens[currentTokenIndex]
    
    const html = generateFrameHtml({
      postUrl: `${hostUrl}/api/frame`,
      imageUrl: token.image,
      title: token.name,
      description: `${token.description} by ${token.artist}`
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
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 