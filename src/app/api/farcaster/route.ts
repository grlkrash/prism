import { NextResponse } from 'next/server'
import { logger } from '@/utils/logger'
import { MBD_AI_CONFIG } from '@/config/mbdAi'

// CORS middleware
function setCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return setCorsHeaders(new NextResponse(null, { status: 200 }))
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')
    const cursor = searchParams.get('cursor')

    if (!endpoint) {
      return setCorsHeaders(
        NextResponse.json(
          { error: 'Missing endpoint parameter' },
          { status: 400 }
        )
      )
    }

    const url = new URL(`${MBD_AI_CONFIG.API_URL}${endpoint}`)
    if (cursor) url.searchParams.set('cursor', cursor)

    const response = await fetch(url.toString(), {
      headers: MBD_AI_CONFIG.HEADERS,
      next: { revalidate: 60 } // Cache for 1 minute
    })

    if (!response.ok) {
      logger.error(`API error: ${response.statusText}`)
      return setCorsHeaders(
        NextResponse.json(
          { error: `API error: ${response.statusText}` },
          { status: response.status }
        )
      )
    }

    const data = await response.json()
    return setCorsHeaders(NextResponse.json(data))
  } catch (error) {
    logger.error('Error in Farcaster route:', error)
    return setCorsHeaders(
      NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    )
  }
} 