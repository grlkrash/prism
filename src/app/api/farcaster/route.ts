import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/utils/logger'

const WARPCAST_API_URL = process.env.WARPCAST_API_URL || 'https://api.warpcast.com/v2'

async function warpcastRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${WARPCAST_API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.WARPCAST_API_KEY}`
    }
  })

  if (!response.ok) {
    throw new Error(`Warpcast API error: ${response.statusText}`)
  }

  return response.json()
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const endpoint = searchParams.get('endpoint')
    const cursor = searchParams.get('cursor')
    const limit = searchParams.get('limit')
    
    if (!endpoint) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing endpoint parameter' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

    let url = endpoint
    if (cursor) url += `&cursor=${cursor}`
    if (limit) url += `&limit=${limit}`

    const data = await warpcastRequest(url)
    return new NextResponse(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    logger.error('Error in Farcaster route:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch from Farcaster API' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const endpoint = searchParams.get('endpoint')
    
    if (!endpoint) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing endpoint parameter' }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

    const body = await req.json()
    
    const data = await warpcastRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    })

    return new NextResponse(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    logger.error('Error in Farcaster route:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch from Farcaster API' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
} 