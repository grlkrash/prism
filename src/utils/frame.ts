import { FrameRequest, Message } from '@farcaster/frame-sdk'
import { logger } from './logger'

export interface FrameValidationResult {
  isValid: boolean
  message?: {
    button: number
    fid: number
    url: string
    messageHash: string
    timestamp: number
    network: number
    buttonId: string
  }
  error?: string
}

export async function validateFrameRequest(req: Request): Promise<FrameValidationResult> {
  try {
    const body = await req.json()
    
    // Log the request body for debugging
    logger.info('[Frame] Validating request:', JSON.stringify(body, null, 2))

    // For development/test, accept requests with correct structure
    if ((process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && 
        body?.untrustedData?.buttonIndex && 
        body?.untrustedData?.fid) {
      return {
        isValid: true,
        message: {
          button: Number(body.untrustedData.buttonIndex),
          fid: Number(body.untrustedData.fid),
          url: body.untrustedData.url || 'http://localhost:3000/frames',
          messageHash: body.untrustedData.messageHash || '0x123',
          timestamp: body.untrustedData.timestamp || Date.now(),
          network: body.untrustedData.network || 1,
          buttonId: body.untrustedData.buttonId || 'discover'
        }
      }
    }

    // For production, validate the frame request
    const frameRequest = body as FrameRequest
    
    if (!frameRequest.untrustedData) {
      return {
        isValid: false,
        error: 'Missing untrusted data'
      }
    }

    const { untrustedData } = frameRequest

    return {
      isValid: true,
      message: {
        button: Number(untrustedData.buttonIndex),
        fid: Number(untrustedData.fid),
        url: untrustedData.url,
        messageHash: untrustedData.messageHash,
        timestamp: untrustedData.timestamp,
        network: untrustedData.network,
        buttonId: untrustedData.buttonId || 'discover'
      }
    }
  } catch (error) {
    logger.error('Frame validation error:', error)
    return {
      isValid: false,
      error: 'Failed to validate frame request'
    }
  }
} 