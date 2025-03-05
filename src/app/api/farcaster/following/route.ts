import { NextResponse } from 'next/server'
import { logger } from '@/utils/logger'

const WARPCAST_API_URL = process.env.NEXT_PUBLIC_FARCASTER_API_URL

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fid = searchParams.get('fid')

    if (!fid) {
      return NextResponse.json({ error: 'Missing fid parameter' }, { status: 400 })
    }

    const response = await fetch(`${WARPCAST_API_URL}/fc/following?fid=${fid}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.FARCASTER_API_KEY || ''
      }
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    logger.error('Error in /api/farcaster/following:', error)
    return NextResponse.json(
      { error: 'Failed to fetch following data' },
      { status: 500 }
    )
  }
} 