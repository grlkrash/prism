import { NextResponse } from 'next/server'
import { logger } from '@/utils/logger'

export async function GET() {
  try {
    const response = await fetch('https://api.warpcast.com/v2/all-channels', {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    logger.error('Error in /api/auth:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Farcaster data' },
      { status: 500 }
    )
  }
} 