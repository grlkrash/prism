import { NextRequest, NextResponse } from 'next/server'
import { MBD_AI_CONFIG } from '@/config/mbdAi'

export async function GET(req: NextRequest) {
  try {
    const endpoint = req.nextUrl.searchParams.get('endpoint')
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 })
    }

    // Production configuration check
    const apiKey = process.env.MBD_API_KEY
    const apiUrl = process.env.MBD_AI_API_URL || 'https://api.mbd.xyz/v2'
    
    // Enhanced logging for API configuration
    console.log('[MBD API] Request details:', {
      endpoint,
      url: apiUrl + endpoint,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': apiKey ? 'Bearer [REDACTED]' : 'MISSING',
        'User-Agent': 'Prism/1.0'
      }
    })

    if (!apiKey) {
      console.error('[MBD API] API key missing')
      return NextResponse.json({ 
        error: 'API configuration error', 
        details: 'API key is not configured' 
      }, { status: 500 })
    }

    // Ensure proper endpoint format
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = new URL(normalizedEndpoint, apiUrl)
    
    // Add query parameters
    const cursor = req.nextUrl.searchParams.get('cursor')
    if (cursor) {
      url.searchParams.set('cursor', cursor)
    }

    // Add cultural token filters
    url.searchParams.set('filter', 'cultural')
    url.searchParams.set('min_score', String(MBD_AI_CONFIG.CULTURAL_TOKEN.MIN_CONTENT_SCORE))
    
    console.log('[MBD API] Making request:', {
      url: url.toString(),
      method: 'GET',
      hasAuth: true,
      filters: {
        cultural: true,
        minScore: MBD_AI_CONFIG.CULTURAL_TOKEN.MIN_CONTENT_SCORE
      }
    })

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'Prism/1.0'
      }
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[MBD API] Error response:', {
        status: response.status,
        statusText: response.statusText,
        url: url.toString(),
        body: errorBody,
        headers: Object.fromEntries(response.headers.entries())
      })

      // Handle specific error cases
      if (response.status === 403) {
        return NextResponse.json({ 
          error: 'Authentication failed', 
          details: 'Invalid or expired API key' 
        }, { status: 403 })
      }

      return NextResponse.json(
        { error: `API request failed: ${response.statusText}`, details: errorBody },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    if (!data || !data.casts) {
      console.error('[MBD API] Invalid response format:', data)
      return NextResponse.json({ 
        error: 'Invalid API response format',
        details: 'Response missing required data'
      }, { status: 502 })
    }

    // Filter cultural tokens
    const culturalCasts = data.casts.filter((cast: any) => {
      const analysis = cast.aiAnalysis || {}
      return analysis.hasCulturalElements || 
             analysis.category?.toLowerCase().includes('art') ||
             analysis.category?.toLowerCase().includes('music') ||
             analysis.category?.toLowerCase().includes('culture')
    })

    console.log('[MBD API] Success:', {
      totalCasts: data.casts.length,
      culturalCasts: culturalCasts.length,
      hasCursor: !!data.next?.cursor
    })

    return NextResponse.json({
      ...data,
      casts: culturalCasts
    })
  } catch (error) {
    console.error('[MBD API] Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
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