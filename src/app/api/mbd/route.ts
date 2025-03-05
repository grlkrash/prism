import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/utils/logger'
import { MBD_AI_CONFIG, isConfigValid } from '@/config/mbdAi'

export async function GET(req: NextRequest) {
  try {
    if (!isConfigValid) {
      return new NextResponse(
        JSON.stringify({ error: 'MBD API configuration is invalid. Please check your environment variables.' }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

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

    const headers = MBD_AI_CONFIG.getHeaders()
    const response = await fetch(`${MBD_AI_CONFIG.API_URL}${endpoint}`, { headers })

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

export async function POST(req: NextRequest) {
  try {
    if (!isConfigValid) {
      return new NextResponse(
        JSON.stringify({ error: 'MBD API configuration is invalid. Please check your environment variables.' }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }

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
    const headers = MBD_AI_CONFIG.getHeaders()
    
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