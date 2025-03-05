import { NobleEd25519Signer } from "@farcaster/hub-nodejs"
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

// Warpcast API configuration
const WARPCAST_API_URL = 'https://api.warpcast.com'

// Auth token generation
export async function generateAuthToken() {
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

// Helper function to make API requests
async function warpcastRequest(endpoint: string) {
  try {
    const authToken = await generateAuthToken()
    const response = await fetch(`${WARPCAST_API_URL}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (!response.ok) {
      throw new FarcasterError(`API request failed: ${response.statusText}`, response.status)
    }

    const data = await response.json()
    return data
  } catch (error) {
    logger.error(`Warpcast API error for ${endpoint}:`, error)
    throw error
  }
}

// Get user profile
export async function getUserProfile(fid: string) {
  try {
    const data = await warpcastRequest(`/v1/user?fid=${fid}`)
    return data.result.user
  } catch (error) {
    logger.error('Failed to get Farcaster user profile:', error)
    throw new FarcasterError('Failed to get Farcaster user profile')
  }
}

// Get user's following list
export async function getFarcasterFollowing(fid: string): Promise<FarcasterUser[]> {
  try {
    const response = await fetch(`/api/farcaster/following?fid=${fid}`)
    if (!response.ok) throw new Error('Failed to fetch following')
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
    const data = await warpcastRequest(`/v2/casts?fid=${fid}&limit=${limit}`)
    return data.result?.casts || []
  } catch (error) {
    logger.error('Error fetching Farcaster casts:', error)
    return []
  }
}

// Search casts
export async function searchCasts(query: string, limit: number = 10) {
  try {
    const data = await warpcastRequest(`/v2/search-casts?q=${encodeURIComponent(query)}&limit=${limit}`)
    return data.result.casts
  } catch (error) {
    logger.error('Failed to search Farcaster casts:', error)
    throw new FarcasterError('Failed to search Farcaster casts')
  }
}

// Get token mentions
export async function getTokenMentions(tokenName: string, limit: number = 10) {
  try {
    const data = await warpcastRequest(`/v2/search-casts?q=$${tokenName}&limit=${limit}`)
    return data.result.casts
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