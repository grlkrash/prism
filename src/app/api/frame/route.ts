import { NextRequest, NextResponse } from 'next/server'
import { tokenDatabase, validateFrameRequest, frameActions } from '../../../utils/mbdAi'

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
  <meta charset="utf-8" />
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${imageUrl}" />
  <meta property="fc:frame:post_url" content="${postUrl}" />
  <meta property="fc:frame:state" content="{}" />
  ${buttons.map((button, index) => `
  <meta property="fc:frame:button:${index + 1}" content="${button.label}" />
  <meta property="fc:frame:button:${index + 1}:action" content="${button.action}" />
  `).join('')}
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta property="og:title" content="Prism: ${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${imageUrl}" />
  <title>Prism: ${title}</title>
  <script>
    // Initialize frame
    window.addEventListener('load', async () => {
      try {
        await window.sdk.actions.ready()
      } catch (error) {
        console.error('Failed to initialize frame:', error)
      }
    })
  </script>
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
    
    const token = tokenDatabase[0]
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
    console.error('Error in GET:', error)
    return new NextResponse('Error', { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { isValid, message } = await validateFrameRequest(req)
    if (!isValid) {
      return new NextResponse('Invalid frame request', { status: 400 })
    }

    const url = new URL(req.url)
    const hostUrl = `${url.protocol}//${url.host}`
    
    // Handle button clicks
    let currentTokenIndex = 0 // In real app, store in KV or similar
    const buttonIndex = message?.button || 0

    switch (buttonIndex) {
      case 1: // Previous
        currentTokenIndex = Math.max(0, currentTokenIndex - 1)
        break
      case 2: // Next
        currentTokenIndex = Math.min(tokenDatabase.length - 1, currentTokenIndex + 1)
        break
      case 3: // Collect
        await frameActions.close()
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
        await frameActions.openUrl(`${hostUrl}/agent?token=${currentTokenIndex}`)
        break
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