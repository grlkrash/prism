import { getFrameMessage, FrameRequest, FrameValidationData } from '@farcaster/frame-sdk'
import { logger } from './logger'

class FarcasterError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message)
    this.name = 'FarcasterError'
  }
}

// Validate frame message
export async function validateFrameMessage(req: FrameRequest): Promise<FrameValidationData | null> {
  try {
    const frameMessage = await getFrameMessage(req)
    return frameMessage
  } catch (error) {
    logger.error('Failed to validate frame message:', error)
    return null
  }
}

// Search casts
export async function searchCasts(query: string, limit: number = 10) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_FARCASTER_API_URL}/casts/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_FARCASTER_API_KEY}`
      },
      body: JSON.stringify({ q: query, limit })
    })

    if (!response.ok) {
      throw new FarcasterError('Failed to search casts', response.status)
    }

    return await response.json()
  } catch (error) {
    logger.error('Failed to search Farcaster casts:', error)
    throw new FarcasterError('Failed to search Farcaster casts')
  }
}

// Get cast by ID
export async function getCastById(castId: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_FARCASTER_API_URL}/casts/${castId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_FARCASTER_API_KEY}`
      }
    })

    if (!response.ok) {
      throw new FarcasterError('Failed to get cast', response.status)
    }

    return await response.json()
  } catch (error) {
    logger.error('Failed to get Farcaster cast:', error)
    throw new FarcasterError('Failed to get Farcaster cast')
  }
}

// Get user profile
export async function getUserProfile(fid: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_FARCASTER_API_URL}/users/${fid}`, {
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_FARCASTER_API_KEY}`
      }
    })

    if (!response.ok) {
      throw new FarcasterError('Failed to get user profile', response.status)
    }

    return await response.json()
  } catch (error) {
    logger.error('Failed to get Farcaster user profile:', error)
    throw new FarcasterError('Failed to get Farcaster user profile')
  }
}

// Get token mentions
export async function getTokenMentions(tokenName: string, limit: number = 10) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_FARCASTER_API_URL}/casts/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_FARCASTER_API_KEY}`
      },
      body: JSON.stringify({ q: `$${tokenName}`, limit })
    })

    if (!response.ok) {
      throw new FarcasterError('Failed to get token mentions', response.status)
    }

    return await response.json()
  } catch (error) {
    logger.error('Failed to get token mentions:', error)
    throw new FarcasterError('Failed to get token mentions')
  }
}