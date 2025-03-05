import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/utils/logger'
import { NobleEd25519Signer } from "@farcaster/hub-nodejs"
import { validateFrameRequest } from '@/utils/mbdAi'

const WARPCAST_API_URL = process.env.NEXT_PUBLIC_FARCASTER_API_URL

async function generateAuthToken() {
  try {
    const fid = process.env.FARCASTER_FID
    const privateKey = process.env.FARCASTER_PRIVATE_KEY
    const publicKey = process.env.FARCASTER_PUBLIC_KEY
    
    if (!fid || !privateKey || !publicKey) {
      throw new Error('Missing Farcaster credentials')
    }

    const signer = new NobleEd25519Signer(new Uint8Array(Buffer.from(privateKey)))
    
    const header = {
      fid: Number(fid),
      type: 'app_key',
      key: publicKey
    }
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
    
    const payload = { exp: Math.floor(Date.now() / 1000) + 300 } // 5 minutes
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
    
    const signatureResult = await signer.signMessageHash(
      Buffer.from(`${encodedHeader}.${encodedPayload}`, 'utf-8')
    )
    
    if (signatureResult.isErr()) {
      throw new Error("Failed to sign message")
    }
    
    const encodedSignature = Buffer.from(signatureResult.value).toString("base64url")
    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`
  } catch (error) {
    logger.error('Failed to generate auth token:', error)
    throw error
  }
}

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const fid = searchParams.get('fid')
    
    if (!fid) {
      return NextResponse.json({ error: 'Missing fid parameter' }, { status: 400 })
    }

    const authToken = await generateAuthToken()
    const response = await fetch(`${WARPCAST_API_URL}/fc/following?fid=${fid}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    logger.error('Error in following route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const validation = await validateFrameRequest(req)
    if (!validation.isValid) {
      return NextResponse.json({ error: 'Invalid frame request' }, { status: 400 })
    }

    const { message } = validation
    // Your existing logic here...
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in following route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 