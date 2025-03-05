import { NextRequest } from 'next/server'
import { logger } from './logger'
import { MBD_AI_CONFIG } from '@/config/mbdAi'

const MBD_API_KEY = process.env.MBD_API_KEY
const MBD_API_URL = process.env.MBD_AI_API_URL || 'https://api.mbd.xyz/v2'

if (!MBD_API_KEY) {
  console.error('[MBD AI] API key not found. Please set MBD_API_KEY in your environment variables.')
}

if (!MBD_API_URL) {
  console.error('[MBD AI] API URL not found')
}

export interface Token {
  id: string | number
  name: string
  symbol: string
  description: string
  imageUrl: string
  artistName: string
  price: string
  culturalScore: number
  tokenType: 'ERC20'
  social?: {
    twitter?: string
    discord?: string
    website?: string
  }
  metadata?: {
    category?: string
    tags?: string[]
    sentiment?: number
    popularity?: number
    aiScore?: number
    isCulturalToken?: boolean
    artStyle?: string
    culturalContext?: string
    artistBio?: string
  }
}

export const tokenDatabase: Token[] = [
  {
    id: 1,
    name: "Digital Renaissance DAO",
    symbol: "RENAI",
    description: "Governance token for the Digital Renaissance platform, empowering digital artists and curators",
    imageUrl: "https://picsum.photos/800/600",
    artistName: "Digital Renaissance Foundation",
    price: "0.1 ETH",
    culturalScore: 0,
    tokenType: 'ERC20',
    social: {
      twitter: 'twitter.com/digitalrenaissance',
      discord: 'discord.gg/digitalrenaissance',
      website: 'digitalrenaissance.art'
    },
    metadata: {
      category: 'Cultural DAO',
      tags: ['art', 'culture', 'governance', 'curation'],
      isCulturalToken: true
    }
  },
  {
    id: 2,
    name: "SoundWave Protocol",
    symbol: "WAVE",
    description: "Music streaming and rights management token for the decentralized audio ecosystem",
    imageUrl: "https://picsum.photos/800/601",
    artistName: "SoundWave Labs",
    price: "0.1 ETH",
    culturalScore: 0,
    tokenType: 'ERC20',
    social: {
      twitter: 'twitter.com/soundwave',
      discord: 'discord.gg/soundwave',
      website: 'soundwavetoken.xyz'
    },
    metadata: {
      category: 'Music and Audio',
      tags: ['music', 'streaming', 'rights', 'audio'],
      isCulturalToken: true
    }
  },
  {
    id: 3,
    name: "Urban Culture Token",
    symbol: "URBAN",
    description: "Governance token for the Urban Canvas platform, connecting street artists with digital opportunities",
    imageUrl: "https://picsum.photos/800/602",
    artistName: "Urban Canvas Foundation",
    price: "0.1 ETH",
    culturalScore: 0,
    tokenType: 'ERC20',
    social: {
      twitter: 'twitter.com/urbancanvas',
      discord: 'discord.gg/urbancanvas',
      website: 'urbancanvas.art'
    },
    metadata: {
      category: 'Cultural DAO',
      tags: ['street art', 'culture', 'urban', 'community'],
      isCulturalToken: true
    }
  },
  {
    id: 4,
    name: "Digital Symphony",
    symbol: "SYMPH",
    description: "Platform token for AI-generated music licensing and distribution",
    imageUrl: "https://picsum.photos/800/603",
    artistName: "Digital Symphony Labs",
    price: "0.15 ETH",
    culturalScore: 0,
    tokenType: 'ERC20',
    social: {
      twitter: 'twitter.com/digitalsymphony',
      discord: 'discord.gg/digitalsymphony',
      website: 'digitalsymphony.xyz'
    },
    metadata: {
      category: 'Music and Audio',
      tags: ['music', 'AI', 'licensing', 'distribution'],
      isCulturalToken: true
    }
  },
  {
    id: 5,
    name: "Media Matrix Protocol",
    symbol: "MATRIX",
    description: "Decentralized media platform governance token for content creators",
    imageUrl: "https://picsum.photos/800/604",
    artistName: "Media Matrix Foundation",
    price: "0.2 ETH",
    culturalScore: 0,
    tokenType: 'ERC20',
    social: {
      twitter: 'twitter.com/mediamatrix',
      discord: 'discord.gg/mediamatrix',
      website: 'mediamatrix.art'
    },
    metadata: {
      category: 'Media and Entertainment',
      tags: ['media', 'content', 'entertainment', 'platform'],
      isCulturalToken: true
    }
  }
]

// API Response Types
interface MbdApiResponse<T> {
  data: T
  error?: {
    code: string
    message: string
  }
}

interface ContentAnalysis {
  category: string
  tags: string[]
  sentiment: number
  popularity: number
  aiScore: number
  culturalContext: string
  artistBio: string
}

interface ImageAnalysis {
  artStyle: string
  isArtwork: boolean
  hasCulturalElements: boolean
  hasAudioElements: boolean
  hasMediaElements: boolean
}

interface Cast {
  hash: string
  threadHash?: string
  parentHash?: string
  author: {
    fid: number
    username: string
    displayName?: string
    pfp?: string
    bio?: string
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
  viewerContext?: {
    liked: boolean
    recasted: boolean
  }
  labels?: string[]
  aiAnalysis?: {
    category: string
    sentiment: number
    popularity: number
    aiScore: number
    culturalContext: string
    artStyle?: string
    isArtwork?: boolean
    hasCulturalElements?: boolean
  }
}

export interface FeedResponse {
  casts: Cast[]
  next?: {
    cursor: string
  }
}

interface LabelsResponse {
  labels: {
    hash: string
    labels: string[]
  }[]
}

interface User {
  fid: number
  username: string
  displayName?: string
  pfp?: string
  bio?: string
  aiAnalysis?: {
    category: string
    sentiment: number
    popularity: number
    aiScore: number
    culturalContext: string
  }
}

interface UsersResponse {
  users: User[]
  next?: {
    cursor: string
  }
}

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: MBD_AI_CONFIG.RATE_LIMIT.MAX_REQUESTS,
  windowMs: MBD_AI_CONFIG.RATE_LIMIT.WINDOW_MS,
  requests: new Map<string, number[]>()
}

// Error types
class MbdApiError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message)
    this.name = 'MbdApiError'
  }
}

class RateLimitError extends MbdApiError {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
    this.code = 'RATE_LIMIT_EXCEEDED'
  }
}

// Rate limiting middleware
function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userRequests = RATE_LIMIT.requests.get(userId) || []
  
  // Remove old requests
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT.windowMs)
  
  if (recentRequests.length >= RATE_LIMIT.maxRequests) {
    return false
  }
  
  recentRequests.push(now)
  RATE_LIMIT.requests.set(userId, recentRequests)
  return true
}

// Update makeMbdRequest to handle errors better
async function makeMbdRequest<T>(endpoint: string, data: any, userId?: string): Promise<T> {
  if (!MBD_API_KEY) {
    throw new MbdApiError('Missing API key')
  }

  // Rate limit check
  if (userId && !checkRateLimit(userId)) {
    throw new RateLimitError('Rate limit exceeded')
  }

  try {
    const response = await fetch(`${MBD_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MBD_API_KEY}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new MbdApiError(
        errorData.error?.message || 'API request failed',
        response.status,
        errorData.error?.code
      )
    }

    const result = await response.json()
    
    // Handle potential undefined data
    if (!result || !result.data) {
      throw new MbdApiError('Invalid API response')
    }

    return result.data as T
  } catch (error) {
    if (error instanceof MbdApiError) {
      throw error
    }
    throw new MbdApiError(error instanceof Error ? error.message : 'Unknown error')
  }
}

export async function analyzeToken(token: Token): Promise<Token> {
  try {
    if (!MBD_API_KEY) {
      // Return token as-is if no API key
      return token
    }

    const response = await fetch(`${MBD_API_URL}/analyze/token`, {
      method: 'POST',
      headers: MBD_AI_CONFIG.getHeaders(),
      body: JSON.stringify(token)
    })

    if (!response.ok) {
      throw new MbdApiError('Failed to analyze token', response.status)
    }

    const data = await response.json()
    return {
      ...token,
      ...data
    }
  } catch (error) {
    logger.error('Error analyzing token:', error)
    // Return original token if analysis fails
    return token
  }
}

function determineIfCulturalToken(contentAnalysis: any, imageAnalysis: any): boolean {
  // Check content analysis indicators
  const contentIndicators = [
    contentAnalysis.category?.toLowerCase().includes('art'),
    contentAnalysis.category?.toLowerCase().includes('culture'),
    contentAnalysis.category?.toLowerCase().includes('music'),
    contentAnalysis.category?.toLowerCase().includes('media'),
    contentAnalysis.tags?.some((tag: string) => 
      tag.toLowerCase().includes('art') || 
      tag.toLowerCase().includes('culture') ||
      tag.toLowerCase().includes('artist') ||
      tag.toLowerCase().includes('creative') ||
      tag.toLowerCase().includes('music') ||
      tag.toLowerCase().includes('sound') ||
      tag.toLowerCase().includes('audio') ||
      tag.toLowerCase().includes('media') ||
      tag.toLowerCase().includes('entertainment')
    ),
    contentAnalysis.culturalContext?.length > 0
  ]

  // Check image analysis indicators
  const imageIndicators = [
    imageAnalysis?.artStyle?.length > 0,
    imageAnalysis?.isArtwork === true,
    imageAnalysis?.hasCulturalElements === true,
    imageAnalysis?.hasAudioElements === true,
    imageAnalysis?.hasMediaElements === true
  ]

  // Calculate confidence score
  const contentScore = contentIndicators.filter(Boolean).length / contentIndicators.length
  const imageScore = imageIndicators.filter(Boolean).length / imageIndicators.length

  // Token is considered cultural if either score is high enough
  return contentScore > 0.6 || imageScore > 0.6
}

export async function getPersonalizedFeed(fid: string | number): Promise<FeedResponse> {
  try {
    // Use client-side endpoint if in browser
    if (typeof window !== 'undefined') {
      const url = new URL(MBD_AI_CONFIG.CLIENT_ENDPOINTS.FOR_YOU_FEED, window.location.origin)
      url.searchParams.append('fid', fid.toString())

      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error(`Failed to fetch personalized feed: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    }

    // Server-side call with API key
    if (!MBD_API_KEY) {
      throw new Error('Missing API key')
    }

    const url = new URL(`${MBD_API_URL}${MBD_AI_CONFIG.SERVER_ENDPOINTS.FEED_FOR_YOU}`)
    url.searchParams.append('fid', fid.toString())

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: MBD_AI_CONFIG.getHeaders(),
      next: { revalidate: 60 }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch personalized feed: ${response.statusText}`)
    }

    const data = await response.json()
    return transformWarpcastResponse(data)
  } catch (error) {
    console.error('Error fetching personalized feed:', error)
    return { casts: [] }
  }
}

// Helper function to transform Warpcast response
function transformWarpcastResponse(data: any): FeedResponse {
  if (!data?.result?.casts) {
    return { casts: [] }
  }

  return {
    casts: data.result.casts.map((cast: any) => ({
      hash: cast.hash,
      threadHash: cast.threadHash,
      parentHash: cast.parentHash,
      author: {
        fid: cast.author.fid,
        username: cast.author.username,
        displayName: cast.author.displayName,
        pfp: cast.author.pfp
      },
      text: cast.text,
      timestamp: cast.timestamp,
      reactions: {
        likes: cast.reactions?.likes || 0,
        recasts: cast.reactions?.recasts || 0
      },
      replies: cast.replies,
      viewerContext: cast.viewerContext,
      labels: cast.labels,
      aiAnalysis: cast.aiAnalysis
    })),
    next: data.next ? { cursor: data.next.cursor } : undefined
  }
}

function calculateCulturalScore(token: Token): number {
  const metadata = token.metadata || {}
  let score = 0

  // Base score from cultural token flag
  if (metadata.isCulturalToken) score += 0.4

  // Additional points for cultural context
  if (metadata.culturalContext) score += 0.2

  // Points for art style identification
  if (metadata.artStyle) score += 0.2

  // Points for artist bio
  if (metadata.artistBio) score += 0.1

  // Points for relevant tags
  if (metadata.tags?.some(tag => 
    tag.toLowerCase().includes('art') || 
    tag.toLowerCase().includes('culture') ||
    tag.toLowerCase().includes('artist') ||
    tag.toLowerCase().includes('creative') ||
    tag.toLowerCase().includes('music') ||
    tag.toLowerCase().includes('sound') ||
    tag.toLowerCase().includes('audio') ||
    tag.toLowerCase().includes('media') ||
    tag.toLowerCase().includes('entertainment')
  )) score += 0.1

  return Math.min(score, 1) // Cap at 1
}

export async function analyzeImage(imageUrl: string, userId?: string) {
  try {
    return await makeMbdRequest<ImageAnalysis>('/vision/analyze', { imageUrl }, userId)
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error
    }
    console.error('Error analyzing image:', error)
    return null
  }
}

export async function getTrendingFeed(cursor?: string): Promise<FeedResponse> {
  try {
    // Use client-side endpoint if in browser
    if (typeof window !== 'undefined') {
      const url = new URL(MBD_AI_CONFIG.CLIENT_ENDPOINTS.TRENDING_FEED, window.location.origin)
      if (cursor) {
        url.searchParams.append('cursor', cursor)
      }

      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error(`Failed to fetch trending feed: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    }

    // Server-side call
    const data = await makeMbdRequest<FeedResponse>(
      MBD_AI_CONFIG.SERVER_ENDPOINTS.FEED_TRENDING,
      { cursor, limit: 20, filter: { type: 'cultural' } }
    )
    
    if (!data || !Array.isArray(data.casts)) {
      throw new Error('Invalid feed response')
    }
    
    return data
  } catch (error) {
    console.error('[ERROR] Error fetching trending feed:', error)
    return { casts: [] }
  }
}

export async function searchCasts(query: string, cursor?: string) {
  try {
    return await makeMbdRequest<FeedResponse>(MBD_AI_CONFIG.SERVER_ENDPOINTS.SEARCH_SEMANTIC, {
      query,
      cursor
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error
    }
    logger.error('Error searching casts:', error)
    return { casts: [], next: undefined }
  }
}

export async function getLabelsForCasts(hashes: string[]) {
  try {
    return await makeMbdRequest<LabelsResponse>(MBD_AI_CONFIG.SERVER_ENDPOINTS.LABELS_FOR_ITEMS, {
      hashes
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error
    }
    logger.error('Error getting labels for casts:', error)
    return { labels: [] }
  }
}

export async function getSimilarUsers(userId: string, cursor?: string) {
  try {
    return await makeMbdRequest<UsersResponse>(MBD_AI_CONFIG.SERVER_ENDPOINTS.USERS_SIMILAR, {
      userId,
      cursor
    }, userId)
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error
    }
    logger.error('Error getting similar users:', error)
    return { users: [], next: undefined }
  }
}

export interface FrameMessage {
  button: number
  fid?: string
}

export async function validateFrameRequest(req: NextRequest): Promise<{ isValid: boolean, message?: FrameMessage }> {
  try {
    const body = await req.json()
    const { untrustedData } = body

    if (!untrustedData) {
      return { isValid: false }
    }

    const { buttonIndex, fid } = untrustedData

    if (!buttonIndex || buttonIndex < 1 || buttonIndex > 4) {
      return { isValid: false }
    }

    return {
      isValid: true,
      message: {
        button: buttonIndex,
        fid: fid ? String(fid) : undefined
      }
    }
  } catch (error) {
    console.error('Error validating frame request:', error)
    return { isValid: false }
  }
}

export const frameActions = {
  close: async () => {
    // Implement close action
  },
  openUrl: async (url: string) => {
    // Implement open URL action
  }
} 