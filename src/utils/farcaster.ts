import { logger } from './logger'

interface FarcasterCast {
  hash: string
  author: {
    fid: number
    username: string
    displayName?: string
  }
  text: string
  timestamp: string
  reactions: {
    likes: number
    recasts: number
  }
  replies?: {
    count: number
  }
}

interface FarcasterUser {
  fid: number
  username: string
  displayName?: string
  following: {
    count: number
  }
  followers: {
    count: number
  }
}

class FarcasterError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message)
    this.name = 'FarcasterError'
  }
}

// Warpcast API base URL
const WARPCAST_API_URL = 'https://api.warpcast.com/v2'

// Get user profile
export async function getUserProfile(fid: string) {
  try {
    const response = await fetch(`${WARPCAST_API_URL}/user?fid=${fid}`)
    if (!response.ok) {
      throw new FarcasterError('Failed to get user profile', response.status)
    }
    return await response.json()
  } catch (error) {
    logger.error('Failed to get Farcaster user profile:', error)
    throw new FarcasterError('Failed to get Farcaster user profile')
  }
}

// Get user's following list
export async function getFarcasterFollowing(fid: string): Promise<FarcasterUser[]> {
  try {
    const response = await fetch(`${WARPCAST_API_URL}/user/following?fid=${fid}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch Farcaster following: ${response.statusText}`)
    }
    const data = await response.json()
    return data.result?.users || []
  } catch (error) {
    logger.error('Error fetching Farcaster following:', error)
    return []
  }
}

// Get user's casts
export async function getFarcasterCasts(fid: string, limit: number = 10): Promise<FarcasterCast[]> {
  try {
    const response = await fetch(`${WARPCAST_API_URL}/user/casts?fid=${fid}&limit=${limit}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch Farcaster casts: ${response.statusText}`)
    }
    const data = await response.json()
    return data.result?.casts || []
  } catch (error) {
    logger.error('Error fetching Farcaster casts:', error)
    return []
  }
}

// Search casts
export async function searchCasts(query: string, limit: number = 10) {
  try {
    const response = await fetch(`${WARPCAST_API_URL}/search?q=${encodeURIComponent(query)}&limit=${limit}`)
    if (!response.ok) {
      throw new FarcasterError('Failed to search casts', response.status)
    }
    return await response.json()
  } catch (error) {
    logger.error('Failed to search Farcaster casts:', error)
    throw new FarcasterError('Failed to search Farcaster casts')
  }
}

// Get token mentions
export async function getTokenMentions(tokenName: string, limit: number = 10) {
  try {
    const response = await fetch(`${WARPCAST_API_URL}/search?q=$${tokenName}&limit=${limit}`)
    if (!response.ok) {
      throw new FarcasterError('Failed to get token mentions', response.status)
    }
    return await response.json()
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