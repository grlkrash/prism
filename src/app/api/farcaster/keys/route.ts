import { NextResponse } from 'next/server'
import { NobleEd25519Signer } from "@farcaster/hub-nodejs"
import { randomBytes } from 'crypto'
import { logger } from '@/utils/logger'

export async function POST() {
  try {
    // Generate random private key
    const privateKey = randomBytes(32)
    const signer = new NobleEd25519Signer(privateKey)
    
    // Get public key
    const publicKeyResult = await signer.getSignerKey()
    if (publicKeyResult.isErr()) {
      throw publicKeyResult.error
    }
    
    const publicKey = publicKeyResult.value
    
    return NextResponse.json({
      privateKey: privateKey.toString('hex'),
      publicKey
    })
  } catch (error) {
    logger.error('Error generating Farcaster keys:', error)
    return NextResponse.json(
      { error: 'Failed to generate Farcaster keys' },
      { status: 500 }
    )
  }
} 