import { logger } from './logger'

export interface FarcasterCast {
  hash: string
  threadHash: string
  parentHash?: string
  author: {
    fid: number
    username: string
    displayName: string
    pfp: string
  }
  text: string
  timestamp: number
  reactions: {
    likes: number
    recasts: number
  }
}

export class FarcasterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FarcasterError'
  }
}

const FARCASTER_API_URL = process.env.NEXT_PUBLIC_FARCASTER_API_URL || 'https://api.warpcast.com'

export async function farcasterRequest(endpoint: string, options: RequestInit = {}) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_FARCASTER_API_URL || 'https://api.warpcast.com'
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FARCASTER_PRIVATE_KEY || ''}`,
        ...options.headers
      }
    })

    if (!response.ok) {
      logger.error(`[ERROR] Farcaster API error: ${response.status} ${response.statusText}`)
      throw new FarcasterError(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    logger.error('[ERROR] Farcaster request failed:', error)
    throw new FarcasterError(error instanceof Error ? error.message : 'Unknown error')
  }
}

// Get user's following
export async function getFarcasterFollowing(fid: string | number, limit = 100) {
  try {
    const data = await farcasterRequest(`v2/following?fid=${fid}&limit=${limit}`)
    return data.following || []
  } catch (error) {
    logger.error('[ERROR] Failed to get following:', error)
    throw new FarcasterError('Failed to get following')
  }
}

// Get user's casts
export async function getFarcasterCasts(fid: string | number, limit = 100) {
  try {
    const data = await farcasterRequest(`v2/casts?fid=${fid}&limit=${limit}`)
    return data.casts || []
  } catch (error) {
    logger.error('[ERROR] Failed to get casts:', error)
    throw new FarcasterError('Failed to get casts')
  }
}

// Get token mentions
export async function getTokenMentions(tokenName: string, limit: number = 10) {
  try {
    const data = await farcasterRequest(`v2/search-casts?q=$${tokenName}&limit=${limit}`)
    return data.result?.casts || []
  } catch (error) {
    logger.error('Failed to get token mentions:', error)
    throw new FarcasterError('Failed to get token mentions')
  }
}

// Helper function to extract token mentions from cast text
export function extractTokenMentions(text: string): Array<{ tokenId: string; category?: string }> {
  const tokenPattern = /\$([A-Za-z0-9]+)/g
  const mentions: Array<{ tokenId: string; category?: string }> = []
  let match

  while ((match = tokenPattern.exec(text)) !== null) {
    mentions.push({
      tokenId: match[1],
      category: determineTokenCategory(text, match[1])
    })
  }

  return mentions
}

// Helper function to determine token category from context
function determineTokenCategory(text: string, tokenId: string): string | undefined {
  const textLower = text.toLowerCase()
  const categories = {
    art: ['art', 'artist', 'artwork', 'gallery', 'exhibition', 'digital art', 'nft'],
    music: ['music', 'song', 'album', 'artist', 'concert', 'sound', 'audio'],
    culture: ['culture', 'cultural', 'heritage', 'tradition', 'community'],
    media: ['media', 'video', 'film', 'movie', 'streaming', 'content'],
    entertainment: ['entertainment', 'game', 'gaming', 'sports', 'event']
  }

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => textLower.includes(keyword))) {
      return category
    }
  }

  return undefined
}