import { logger } from './logger'
import { FarcasterError } from './errors'

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

export interface FarcasterResponse<T> {
  data: T
  next?: {
    cursor?: string
  }
}

interface FarcasterFollowing {
  following: Array<{
    fid: number
    username: string
    displayName: string
    pfp: string
  }>
}

interface FarcasterCasts {
  casts: FarcasterCast[]
}

const FARCASTER_API_URL = process.env.NEXT_PUBLIC_FARCASTER_API_URL || 'https://api.warpcast.com'
const FARCASTER_API_KEY = process.env.FARCASTER_API_KEY

export async function farcasterRequest<T>(endpoint: string, options: RequestInit = {}): Promise<FarcasterResponse<T>> {
  try {
    // Ensure endpoint starts with /v2 if not already
    const apiEndpoint = endpoint.startsWith('/v2') ? endpoint : `/v2${endpoint}`
    
    // Construct absolute URL
    const url = new URL(apiEndpoint, FARCASTER_API_URL)
    
    if (!FARCASTER_API_KEY) {
      throw new FarcasterError('Farcaster API key not found')
    }

    logger.info(`[Farcaster] Requesting: ${url.toString()}`)

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FARCASTER_API_KEY}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`[Farcaster] API error: ${response.status} ${response.statusText}`, errorText)
      throw new FarcasterError(`API error: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    logger.error('[ERROR] Farcaster request failed:', error)
    throw error instanceof FarcasterError ? error : new FarcasterError(String(error))
  }
}

// Get user's following
export async function getFarcasterFollowing(fid: string | number, limit = 100) {
  try {
    const data = await farcasterRequest<FarcasterFollowing>(`/following?fid=${fid}&limit=${limit}`)
    return data.data.following || []
  } catch (error) {
    logger.error('[ERROR] Failed to get following:', error)
    throw new FarcasterError('Failed to get following')
  }
}

// Get user's casts
export async function getFarcasterCasts(fid: string | number, limit = 100) {
  try {
    const data = await farcasterRequest<FarcasterCasts>(`/casts?fid=${fid}&limit=${limit}`)
    return data.data.casts || []
  } catch (error) {
    logger.error('[ERROR] Failed to get casts:', error)
    throw new FarcasterError('Failed to get casts')
  }
}

// Get token mentions
export async function getTokenMentions(tokenName: string, limit: number = 10): Promise<FarcasterCast[]> {
  try {
    if (!FARCASTER_API_KEY) {
      logger.warn('Farcaster API key not found, using mock data')
      return [
        {
          hash: '0x1',
          threadHash: '0x1',
          author: {
            fid: 1,
            username: 'artist',
            displayName: 'Digital Artist',
            pfp: 'https://example.com/pfp.jpg'
          },
          text: `Check out this amazing art token $${tokenName}`,
          timestamp: Date.now(),
          reactions: { likes: 10, recasts: 5 }
        }
      ]
    }

    // First get trending casts
    const trendingData = await farcasterRequest<FarcasterCasts>('/feed/trending')
    const artCasts = trendingData.data.casts || []

    // Then search for specific token mentions
    const searchData = await farcasterRequest<FarcasterCasts>(`/search?q=$${tokenName}&limit=${limit}`)
    const tokenCasts = searchData.data.casts || []

    // Combine and deduplicate casts
    const allCasts = [...artCasts, ...tokenCasts]
    const uniqueCasts = Array.from(new Map(allCasts.map(cast => [cast.hash, cast])).values())

    // Filter for art/culture related content and token mentions
    const culturalCasts = uniqueCasts.filter(cast => {
      const text = cast.text.toLowerCase()
      const hasTokenMention = text.includes(`$${tokenName.toLowerCase()}`)
      const hasCulturalTerms = 
        text.includes('art') ||
        text.includes('artist') ||
        text.includes('creative') ||
        text.includes('culture') ||
        text.includes('cultural') ||
        text.includes('music') ||
        text.includes('song') ||
        text.includes('album') ||
        text.includes('media') ||
        text.includes('film') ||
        text.includes('video')

      return hasTokenMention || hasCulturalTerms
    })

    // Sort by engagement and cultural relevance
    return culturalCasts
      .sort((a, b) => {
        const scoreA = calculateCulturalScore(a) * 0.7 + (a.reactions.likes + (a.reactions.recasts * 2)) * 0.3
        const scoreB = calculateCulturalScore(b) * 0.7 + (b.reactions.likes + (b.reactions.recasts * 2)) * 0.3
        return scoreB - scoreA
      })
      .slice(0, limit)

  } catch (error) {
    logger.error('Failed to get token mentions:', error)
    throw error
  }
}

// Helper function to calculate cultural score for a cast
export function calculateCulturalScore(cast: FarcasterCast): number {
  const text = cast.text.toLowerCase()
  let score = 0

  // Check for cultural indicators
  const culturalTerms = [
    'art', 'artist', 'creative', 'culture', 'cultural',
    'music', 'song', 'album', 'media', 'film', 'video'
  ]

  // Add score for each cultural term found
  culturalTerms.forEach(term => {
    if (text.includes(term)) score += 0.1
  })

  // Add score for token mentions
  if (text.includes('$')) score += 0.2

  // Add score for engagement
  score += Math.min(0.3, (cast.reactions.likes + cast.reactions.recasts * 2) / 1000)

  return Math.min(1, score)
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