import { NextRequest, NextResponse } from 'next/server'
import { MBD_AI_CONFIG } from '@/config/mbdAi'

export async function GET(req: NextRequest) {
  try {
    const endpoint = req.nextUrl.searchParams.get('endpoint')
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 })
    }

    const url = new URL(endpoint, MBD_AI_CONFIG.API_URL)
    const cursor = req.nextUrl.searchParams.get('cursor')
    if (cursor) url.searchParams.set('cursor', cursor)

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_MBD_API_KEY}`
      }
    })

    if (!response.ok) {
      console.error('[MBD API] Error response:', {
        status: response.status,
        statusText: response.statusText
      })
      return NextResponse.json(
        { error: `API request failed: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[MBD API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { endpoint, body } = await req.json()
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 })
    }

    const url = new URL(endpoint, MBD_AI_CONFIG.API_URL)
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_MBD_API_KEY}`
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      console.error('[MBD API] Error response:', {
        status: response.status,
        statusText: response.statusText
      })
      return NextResponse.json(
        { error: `API request failed: ${response.statusText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[MBD API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 