import { NextRequest, NextResponse } from 'next/server'

function generateFrameHtml({
  imageUrl,
  postUrl
}: {
  imageUrl: string
  postUrl: string
}) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${imageUrl}" />
    <meta property="fc:frame:post_url" content="${postUrl}" />
    <meta property="fc:frame:button:1" content="Previous" />
    <meta property="fc:frame:button:2" content="Next" />
    <meta property="fc:frame:button:3" content="Collect" />
    <meta property="fc:frame:button:1:action" content="post" />
    <meta property="fc:frame:button:2:action" content="post" />
    <meta property="fc:frame:button:3:action" content="post" />
    <meta property="fc:frame:aspect_ratio" content="1.91:1" />
    <meta property="og:title" content="Prism: Digital Dreams" />
    <meta property="og:description" content="Discover and collect digital art" />
    <meta property="og:image" content="${imageUrl}" />
  </head>
  <body>
    <h1>Prism: Digital Dreams</h1>
    <p>A gallery of digital dreams and artistic expressions.</p>
  </body>
</html>`
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const hostUrl = `${url.protocol}//${url.host}`
    
    const html = generateFrameHtml({
      postUrl: `${hostUrl}/api/frame`,
      imageUrl: 'https://placehold.co/800x418/png'
    })
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
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
    
    const html = generateFrameHtml({
      postUrl: `${hostUrl}/api/frame`,
      imageUrl: 'https://placehold.co/800x418/png'
    })
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('Error in POST:', error)
    return new NextResponse('Error', { status: 500 })
  }
} 