import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const frameUrl = 'https://mac-mini-1.tail9ee89b.ts.net/api/frame'
  
  try {
    const response = await fetch(frameUrl)
    const html = await response.text()
    
    return NextResponse.json({
      status: 'ok',
      frameUrl,
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      html
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({
      status: 'error',
      frameUrl,
      error: error.message
    }, { status: 500 })
  }
} 