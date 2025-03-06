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
  next?: {
    cursor?: string
  }
}

const FARCASTER_API_URL = process.env.NEXT_PUBLIC_FARCASTER_API_URL || 'https://api.warpcast.com/v2'
const FARCASTER_API_KEY = process.env.FARCASTER_API_KEY

export async function farcasterRequest<T>(endpoint: string, options: RequestInit = {}): Promise<FarcasterResponse<T>> {
  try {
    // Ensure endpoint starts with /v2 if not already
    const apiEndpoint = endpoint.startsWith('/v2') ? endpoint : `/v2${endpoint}`
    
    // Construct absolute URL
    const url = new URL(apiEndpoint, FARCASTER_API_URL)
    
    if (!FARCASTER_API_KEY) {
      logger.error('[Farcaster] API key not found')
      throw new FarcasterError('Farcaster API key not found')
    }

    logger.info(`[Farcaster] Requesting: ${url.toString()}`)
    logger.info('[Farcaster] Headers:', {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer [REDACTED]'
    })

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
      logger.error(`[Farcaster] API error: ${response.status} ${response.statusText}`, {
        url: url.toString(),
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      throw new FarcasterError(`API error: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    logger.info(`[Farcaster] Response received:`, {
      endpoint,
      status: response.status,
      dataKeys: Object.keys(data),
      hasResult: !!data.result,
      hasData: !!data.data
    })

    // Handle both response formats (result and data)
    if (data.result) {
      return { data: data.result, next: data.next }
    }
    return data
  } catch (error) {
    logger.error('[ERROR] Farcaster request failed:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
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

// Define cultural keywords first
const culturalKeywords = [
  'art', 'artist', 'artwork', 'gallery', 'exhibition', 'digital art', 'nft',
  'music', 'song', 'album', 'concert', 'sound', 'audio',
  'culture', 'cultural', 'heritage', 'tradition', 'community',
  'media', 'video', 'film', 'movie', 'streaming', 'content',
  'entertainment', 'game', 'gaming', 'sports', 'event',
  'creative', 'design', 'aesthetic', 'beauty', 'expression'
]

// Add cache interface and implementation
interface TokenMentionsCache {
  [key: string]: {
    casts: FarcasterCast[]
    timestamp: number
  }
}

const tokenMentionsCache: TokenMentionsCache = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Get token mentions with caching
export async function getTokenMentions(token: string, fid?: number): Promise<FarcasterCast[]> {
  try {
    // Use default FID from env if not provided
    const targetFid = fid || Number(process.env.FARCASTER_FID)
    if (!targetFid) {
      throw new FarcasterError('No FID provided and FARCASTER_FID not set in environment')
    }

    // Check cache first
    const cacheKey = `${token}-${targetFid}`
    const cached = tokenMentionsCache[cacheKey]
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.info(`[Farcaster] Using cached token mentions for ${token}`)
      return cached.casts
    }

    // Try different search patterns
    const searchPatterns = [
      `$${token}`,
      token,
      `#${token}`,
      `token:${token}`
    ]

    let allCasts: FarcasterCast[] = []
    let nextCursor: string | undefined

    // Fetch casts for each search pattern
    for (const pattern of searchPatterns) {
      try {
        logger.info(`[Farcaster] Searching for pattern: ${pattern}`)
        const response = await farcasterRequest<FarcasterCasts>(
          `/search/casts?q=${encodeURIComponent(pattern)}&fid=${targetFid}&limit=100${nextCursor ? `&cursor=${nextCursor}` : ''}`
        )
        
        logger.info(`[Farcaster] Response for pattern ${pattern}:`, {
          hasData: !!response.data,
          dataLength: response.data?.casts?.length,
          hasNext: !!response.next
        })

        if (response.data?.casts) {
          allCasts = [...allCasts, ...response.data.casts]
        }
        
        // Update cursor for pagination
        nextCursor = response.next?.cursor
      } catch (error) {
        logger.error(`Error fetching casts for pattern ${pattern}:`, error)
      }
    }

    logger.info(`Found ${allCasts.length} total casts for token ${token}`)

    // Remove duplicates based on hash
    const uniqueCasts = Array.from(new Map(allCasts.map(cast => [cast.hash, cast])).values())
    logger.info(`After removing duplicates: ${uniqueCasts.length} casts`)

    const filteredCasts = uniqueCasts.filter((cast) => {
      const text = cast.text.toLowerCase()
      const tokenLower = token.toLowerCase()
      
      // Check for token mentions (more flexible matching)
      const hasToken = text.includes(tokenLower) || 
                      text.includes(`$${tokenLower}`) ||
                      text.includes(`#${tokenLower}`) ||
                      text.includes(`token:${tokenLower}`) ||
                      // Add support for any $TOKEN format
                      /\$[A-Za-z0-9]+/.test(text)
      
      // If we have a token mention, check for cultural context
      if (hasToken) {
        // Check for cultural keywords in the same cast
        const hasCulturalContext = culturalKeywords.some(keyword => 
          text.includes(keyword.toLowerCase())
        )

        // If no direct cultural keywords, check for cultural score
        if (!hasCulturalContext) {
          const culturalScore = calculateCulturalScore(cast)
          if (culturalScore > 0.3) {
            logger.info(`Cast has cultural score: ${cast.text.substring(0, 50)}...`, {
              text,
              culturalScore,
              reactions: cast.reactions
            })
            return true
          }
        } else {
          logger.info(`Cast has cultural context: ${cast.text.substring(0, 50)}...`, {
            text,
            hasCulturalContext,
            reactions: cast.reactions
          })
          return true
        }
      }

      return false
    })

    logger.info(`Filtered down to ${filteredCasts.length} cultural casts`)

    // Cache the results
    tokenMentionsCache[cacheKey] = {
      casts: filteredCasts,
      timestamp: Date.now()
    }

    return filteredCasts
  } catch (error) {
    logger.error('[Farcaster] Failed to get token mentions:', error)
    throw new FarcasterError('Failed to get token mentions')
  }
}

// Helper function to calculate cultural score for a cast
export function calculateCulturalScore(cast: FarcasterCast): number {
  const text = cast.text.toLowerCase()
  let score = 0

  // Check for cultural indicators
  const culturalTerms = [
    'art', 'artist', 'creative', 'culture', 'cultural',
    'music', 'song', 'album', 'media', 'film', 'video',
    'animation', 'interactive', 'experience', 'immersive',
    'virtual reality', 'augmented reality', 'mixed reality',
    '3d', 'motion', 'graphics', 'visualization', 'simulation'
  ]

  // Add score for each cultural term found
  culturalTerms.forEach(term => {
    if (text.includes(term)) score += 0.1
  })

  // Add score for engagement
  const engagementScore = (cast.reactions.likes + cast.reactions.recasts * 2) / 1000
  score += Math.min(0.3, engagementScore)

  // Ensure score is between 0 and 1
  return Math.min(1, Math.max(0, score))
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