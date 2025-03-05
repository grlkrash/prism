import { NextRequest } from 'next/server'
import { logger } from './logger'
import { MBD_AI_CONFIG, isTestMode } from '@/config/mbdAi'

// Remove direct API key access since we're using the proxy
const API_URL = process.env.MBD_AI_API_URL || 'https://api.mbd.xyz/v2'
const API_KEY = process.env.MBD_API_KEY

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
  aiAnalysis?: {
    culturalScore?: number
    hasCulturalElements?: boolean
    category?: string
    tags?: string[]
    sentiment?: string | number
    popularity?: number
    aiScore?: number
  }
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

export interface Cast {
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
  metadata?: {
    culturalScore?: number
    authorFid?: string
    authorUsername?: string
    timestamp?: number
    likes?: number
    recasts?: number
    category?: string
    tags?: string[]
    sentiment?: number
    popularity?: number
    aiScore?: number
    isCulturalToken?: boolean
    artStyle?: string
    culturalContext?: string
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
async function makeRequest(endpoint: string, options: RequestInit = {}) {
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${MBD_AI_CONFIG.API_URL}${endpoint}`
    
    // Get headers from config
    const headers = MBD_AI_CONFIG.getHeaders()
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    })

    if (!response.ok) {
      logger.error(`MBD AI request failed: ${response.status} ${response.statusText}`)
      throw new Error(`MBD AI request failed: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    logger.error('MBD AI request error:', error)
    throw error
  }
}

export async function analyzeToken(tokenId: string): Promise<Token> {
  try {
    // In development/test mode, return mock data
    if (process.env.NODE_ENV === 'development' || isTestMode) {
      const mockToken = tokenDatabase.find(t => t.id.toString() === tokenId) || tokenDatabase[0]
      return {
        ...mockToken,
        aiAnalysis: {
          culturalScore: 0.8,
          hasCulturalElements: true,
          category: mockToken.metadata?.category || 'art',
          tags: mockToken.metadata?.tags || [],
          sentiment: 1,
          popularity: 1,
          aiScore: 0.8
        }
      }
    }

    // Production API call
    const response = await fetch(`${API_URL}/tokens/analyze/${tokenId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Version': '2'
      }
    })

    if (!response.ok) {
      throw new Error(`MBD AI request failed: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    logger.error('[MBD AI] Token analysis error:', error)
    // Return mock data as fallback
    const mockToken = tokenDatabase.find(t => t.id.toString() === tokenId) || tokenDatabase[0]
    return {
      ...mockToken,
      aiAnalysis: {
        culturalScore: 0.8,
        hasCulturalElements: true,
        category: mockToken.metadata?.category || 'art',
        tags: mockToken.metadata?.tags || [],
        sentiment: 1,
        popularity: 1,
        aiScore: 0.8
      }
    }
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

export async function getPersonalizedFeed(userId?: string): Promise<MbdApiResponse<FeedResponse>> {
  try {
    // In development/test mode, return mock data
    if (process.env.NODE_ENV === 'development' || isTestMode) {
      return {
        data: {
          casts: tokenDatabase.map(token => ({
            hash: token.id.toString(),
            author: {
              fid: 1,
              username: token.artistName
            },
            text: token.description,
            timestamp: new Date().toISOString(),
            reactions: { likes: 0, recasts: 0 },
            aiAnalysis: {
              hasCulturalElements: true,
              category: token.metadata?.category || 'art',
              sentiment: 1,
              popularity: 1,
              aiScore: 0.8,
              culturalContext: token.metadata?.culturalContext || 'digital art'
            }
          }))
        }
      }
    }

    // Production API call
    const response = await fetch(`${API_URL}/feed/personalized${userId ? `?userId=${userId}` : ''}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-API-Version': '2'
      }
    })

    if (!response.ok) {
      throw new Error(`MBD AI request failed: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    logger.error('[MBD AI] Feed error:', error)
    // Return mock data as fallback
    return {
      data: {
        casts: tokenDatabase.map(token => ({
          hash: token.id.toString(),
          author: {
            fid: 1,
            username: token.artistName
          },
          text: token.description,
          timestamp: new Date().toISOString(),
          reactions: { likes: 0, recasts: 0 },
          aiAnalysis: {
            hasCulturalElements: true,
            category: token.metadata?.category || 'art',
            sentiment: 1,
            popularity: 1,
            aiScore: 0.8,
            culturalContext: token.metadata?.culturalContext || 'digital art'
          }
        }))
      }
    }
  }
}

export function calculateCulturalScore(token: Token): number {
  const {
    aiAnalysis = {},
    metadata = {}
  } = token

  const {
    culturalScore = 0,
    hasCulturalElements = false,
    category = '',
    tags = [],
    sentiment = 0,
    popularity = 0,
    aiScore = 0
  } = { ...aiAnalysis, ...metadata }

  // Base score from AI analysis
  let score = culturalScore

  // Boost score if has cultural elements
  if (hasCulturalElements) score += 0.2

  // Boost for art/music/culture categories
  if (['art', 'music', 'culture'].includes(category.toLowerCase())) {
    score += 0.1
  }

  // Boost for cultural tags
  const culturalTags = ['art', 'music', 'culture', 'creative', 'digital']
  const tagBoost = (tags || []).filter((tag: string) => 
    culturalTags.includes(tag.toLowerCase())
  ).length * 0.05
  score += tagBoost

  // Consider sentiment and popularity
  if (sentiment === 'positive' || (typeof sentiment === 'number' && sentiment > 0.5)) {
    score += 0.05
  }
  score += (typeof popularity === 'number' ? popularity : 0) * 0.1
  score += (typeof aiScore === 'number' ? aiScore : 0) * 0.1

  // Cap at 1.0
  return Math.min(1, Math.max(0, score))
}

export async function analyzeImage(imageUrl: string, userId?: string) {
  try {
    const result = await makeRequest('/vision/analyze', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
      headers: {
        'X-User-Id': userId || 'anonymous'
      }
    })
    return result as ImageAnalysis
  } catch (error) {
    logger.error('Error analyzing image:', error)
    throw error
  }
}

export async function getTrendingFeed(cursor?: string) {
  console.log('[MBD AI] Fetching production trending feed')
  
  try {
    const params = new URLSearchParams({
      endpoint: MBD_AI_CONFIG.SERVER_ENDPOINTS.FEED_TRENDING
    })

    if (cursor) {
      params.append('cursor', cursor)
    }

    const requestUrl = `/api/mbd?${params.toString()}`
    console.log('[MBD AI] Making production request to:', requestUrl)

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[MBD AI] Production error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      })
      throw new Error(`Failed to fetch trending feed: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const result = await response.json()
    
    if (!result || !result.data) {
      console.error('[MBD AI] Invalid production response:', result)
      throw new Error('Invalid API response format')
    }

    console.log('[MBD AI] Production data fetched:', {
      hasData: !!result.data,
      hasNextCursor: !!result.data.next
    })

    return result.data
  } catch (error) {
    console.error('[MBD AI] Production error in getTrendingFeed:', error)
    throw error
  }
}

export async function searchCasts(query: string, cursor?: string) {
  try {
    const result = await makeRequest(MBD_AI_CONFIG.SERVER_ENDPOINTS.SEARCH_SEMANTIC, {
      method: 'POST',
      body: JSON.stringify({ query, cursor })
    })
    return result as FeedResponse
  } catch (error) {
    logger.error('Error searching casts:', error)
    throw error
  }
}

export async function getLabelsForCasts(hashes: string[]) {
  try {
    const result = await makeRequest(MBD_AI_CONFIG.SERVER_ENDPOINTS.LABELS_FOR_ITEMS, {
      method: 'POST',
      body: JSON.stringify({ hashes })
    })
    return result as LabelsResponse
  } catch (error) {
    logger.error('Error getting labels:', error)
    throw error
  }
}

export async function getSimilarUsers(userId: string, cursor?: string) {
  try {
    const result = await makeRequest(MBD_AI_CONFIG.SERVER_ENDPOINTS.USERS_SIMILAR, {
      method: 'POST',
      body: JSON.stringify({ userId, cursor }),
      headers: {
        'X-User-Id': userId
      }
    })
    return result as UsersResponse
  } catch (error) {
    logger.error('Error getting similar users:', error)
    throw error
  }
}

export interface FrameMessage {
  button: number
  fid?: string
}

export async function validateFrameRequest(req: NextRequest): Promise<{ isValid: boolean, message?: FrameMessage }> {
  try {
    // In development, allow all requests with test data
    if (process.env.NODE_ENV === 'development') {
      return {
        isValid: true,
        message: {
          button: 1,
          fid: 'test-user-123'
        }
      }
    }

    const body = await req.json()
    
    // Basic validation for required fields
    if (!body || !body.untrustedData) {
      return { isValid: false }
    }

    const buttonIndex = body.untrustedData.buttonIndex
    const fid = body.untrustedData.fid

    // Validate button index is between 1-4
    if (!buttonIndex || buttonIndex < 1 || buttonIndex > 4) {
      return { isValid: false }
    }

    return {
      isValid: true,
      message: {
        button: buttonIndex,
        fid: fid || 'test-user-123'
      }
    }
  } catch (error) {
    console.error('Frame validation error:', error)
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