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
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${imageUrl}" />
    <meta property="fc:frame:post_url" content="${postUrl}" />
    <meta property="fc:frame:button:1" content="Previous" />
    <meta property="fc:frame:button:2" content="Next" />
    <meta property="fc:frame:button:3" content="Collect" />
    <meta property="og:title" content="Prism: Digital Dreams #1" />
    <meta property="og:description" content="A mesmerizing piece of digital art by AI Artist" />
    <title>Prism: Digital Dreams #1</title>
  </head>
  <body>
    <h1>Prism: Digital Dreams #1</h1>
    <p>A mesmerizing piece of digital art by AI Artist</p>
  </body>
</html>`
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const hostUrl = `${url.protocol}//${url.host}`
    
    const html = generateFrameHtml({
      postUrl: `${hostUrl}/api/frame`,
      imageUrl: 'https://placehold.co/600x315/png'
    })
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*'
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
      imageUrl: 'https://placehold.co/600x315/png'
    })
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('Error in POST:', error)
    return new NextResponse('Error', { status: 500 })
  }
} 