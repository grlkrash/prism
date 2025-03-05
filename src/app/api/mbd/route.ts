import { NextRequest, NextResponse } from 'next/server'
import { MBD_AI_CONFIG } from '@/config/mbdAi'

export async function GET(req: NextRequest) {
  try {
    const endpoint = req.nextUrl.searchParams.get('endpoint')
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 })
    }

    // Log the API configuration
    console.log('[MBD API] Configuration:', {
      apiUrl: MBD_AI_CONFIG.API_URL,
      endpoint,
      hasApiKey: !!process.env.MBD_API_KEY
    })

    // Ensure the endpoint starts with a forward slash
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = new URL(normalizedEndpoint, MBD_AI_CONFIG.API_URL)
    
    console.log('[MBD API] Constructed URL:', url.toString())

    const cursor = req.nextUrl.searchParams.get('cursor')
    if (cursor) {
      url.searchParams.set('cursor', cursor)
      console.log('[MBD API] Added cursor:', cursor)
    }

    console.log('[MBD API] Making request with headers:', {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MBD_API_KEY?.substring(0, 8)}...`
    })

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.MBD_API_KEY}`
      }
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[MBD API] Error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        url: url.toString()
      })
      return NextResponse.json(
        { error: `API request failed: ${response.statusText}`, details: errorBody },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[MBD API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
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

    // Log the API configuration
    console.log('[MBD API] Configuration:', {
      apiUrl: MBD_AI_CONFIG.API_URL,
      endpoint,
      hasApiKey: !!process.env.MBD_API_KEY
    })

    // Ensure the endpoint starts with a forward slash
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = new URL(normalizedEndpoint, MBD_AI_CONFIG.API_URL)
    
    console.log('[MBD API] Constructed URL:', url.toString())

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.MBD_API_KEY}`
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[MBD API] Error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        url: url.toString()
      })
      return NextResponse.json(
        { error: `API request failed: ${response.statusText}`, details: errorBody },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[MBD API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 