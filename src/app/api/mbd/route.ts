import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/utils/logger'
import { MBD_AI_CONFIG } from '@/config/mbdAi'

export async function GET(req: NextRequest) {
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

    const response = await fetch(`${MBD_AI_CONFIG.API_URL}${endpoint}`, {
      headers: MBD_AI_CONFIG.getHeaders()
    })

    if (!response.ok) {
      throw new Error(`MBD API error: ${response.statusText}`)
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
      JSON.stringify({ error: 'Failed to fetch from MBD API' }),
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
    
    const response = await fetch(`${MBD_AI_CONFIG.API_URL}${endpoint}`, {
      method: 'POST',
      headers: MBD_AI_CONFIG.getHeaders(),
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(`MBD API error: ${response.statusText}`)
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
      JSON.stringify({ error: 'Failed to fetch from MBD API' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
} 