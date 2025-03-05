import { Frame } from '@farcaster/frame-sdk'
import { logger } from './logger'

class FarcasterError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message)
    this.name = 'FarcasterError'
  }
}

// Initialize Farcaster client
const farcasterClient = new Frame({
  apiKey: process.env.NEXT_PUBLIC_FARCASTER_API_KEY || '',
  baseUrl: process.env.NEXT_PUBLIC_FARCASTER_API_URL || 'https://api.farcaster.xyz',
})

export async function searchCasts(query: string, limit: number = 10) {
  try {
    const response = await farcasterClient.searchCasts({
      query,
      limit,
    })
    return response
  } catch (error) {
    logger.error('Failed to search Farcaster casts:', error)
    throw new FarcasterError('Failed to search Farcaster casts')
  }
}

export async function getCastById(castId: string) {
  try {
    const response = await farcasterClient.getCast({
      hash: castId,
    })
    return response
  } catch (error) {
    logger.error('Failed to get Farcaster cast:', error)
    throw new FarcasterError('Failed to get Farcaster cast')
  }
}

export async function getUserProfile(fid: string) {
  try {
    const response = await farcasterClient.getUser({
      fid: parseInt(fid),
    })
    return response
  } catch (error) {
    logger.error('Failed to get Farcaster user profile:', error)
    throw new FarcasterError('Failed to get Farcaster user profile')
  }
}

export async function getTokenMentions(tokenName: string, limit: number = 10) {
  try {
    const response = await farcasterClient.searchCasts({
      query: `$${tokenName}`,
      limit,
    })
    return response
  } catch (error) {
    logger.error('Failed to get token mentions:', error)
    throw new FarcasterError('Failed to get token mentions')
  }
}

export { farcasterClient } 