import { NextResponse } from 'next/server'
import { logger } from '@/utils/logger'
import { generateAuthToken } from '@/utils/farcaster'

const WARPCAST_API_URL = process.env.NEXT_PUBLIC_FARCASTER_API_URL || 'https://api.warpcast.com/v2'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')
    const cursor = searchParams.get('cursor')

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 })
    }

    const authToken = await generateAuthToken()
    if (!authToken) {
      return NextResponse.json({ error: 'Failed to generate auth token' }, { status: 401 })
    }

    const url = new URL(endpoint, WARPCAST_API_URL)
    if (cursor) {
      url.searchParams.append('cursor', cursor)
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    logger.error('Error in /api/farcaster:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Farcaster data' },
      { status: 500 }
    )
  }
} 