import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/utils/logger'
import { MBD_AI_CONFIG } from '@/config/mbdAi'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const endpoint = searchParams.get('endpoint')
    const params = searchParams.get('params')
    
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

    let headers
    try {
      headers = MBD_AI_CONFIG.getHeaders()
    } catch (error) {
      logger.error('Error getting MBD headers:', error)
      return new NextResponse(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Failed to configure MBD API'
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

    const url = new URL(`${MBD_AI_CONFIG.API_URL}${endpoint}`)
    
    // Add parameters if they exist
    if (params) {
      try {
        const parsedParams = JSON.parse(params)
        Object.entries(parsedParams).forEach(([key, value]) => {
          if (value !== undefined) {
            url.searchParams.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
          }
        })
      } catch (e) {
        logger.error('Error parsing params:', e)
      }
    }

    const response = await fetch(url.toString(), { 
      headers,
      next: { revalidate: 60 } // Cache for 1 minute
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(`MBD API error: ${errorData.message || response.statusText}`)
    }

    const data = await response.json()
    return new NextResponse(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
      }
    })
  } catch (error) {
    logger.error('Error in MBD route:', error)
    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to fetch from MBD API'
      }),
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
    let headers
    try {
      headers = MBD_AI_CONFIG.getHeaders()
    } catch (error) {
      logger.error('Error getting MBD headers:', error)
      return new NextResponse(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Failed to configure MBD API'
        }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }
    
    const response = await fetch(`${MBD_AI_CONFIG.API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(`MBD API error: ${errorData.message || response.statusText}`)
    }

    const data = await response.json()
    return new NextResponse(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    logger.error('Error in MBD route:', error)
    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to fetch from MBD API'
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
} 