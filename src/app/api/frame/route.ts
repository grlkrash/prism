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
  return `
<!DOCTYPE html>
<html>
<head>
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${imageUrl}" />
  <meta property="fc:frame:post_url" content="${postUrl}" />
  <meta property="fc:frame:button:1" content="Previous" />
  <meta property="fc:frame:button:2" content="Next" />
  <meta property="fc:frame:button:3" content="Collect" />
  <meta property="fc:frame:button:4" content="Ask Agent" />
  <title>${title}</title>
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
    // Use a more reliable image URL
    const imageUrl = 'https://raw.githubusercontent.com/grlkrsh/prism/main/public/token1.jpg'
    
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
        return new NextResponse(
          JSON.stringify({ 
            success: true, 
            message: 'Token collected successfully!' 
          }), 
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
      case 4: // Ask Agent
        return new NextResponse(
          JSON.stringify({ 
            success: true, 
            message: 'Opening agent chat...',
            location: `${hostUrl}/agent?token=${currentTokenIndex}`
          }), 
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          }
        )
    }

    const token = tokenDatabase[currentTokenIndex]
    const html = generateFrameHtml({
      postUrl: `${hostUrl}/api/frame`,
      imageUrl: token.imageUrl,
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
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 