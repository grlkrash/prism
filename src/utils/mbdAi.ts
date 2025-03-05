import { NextRequest } from 'next/server'
import { logger } from './logger'

export interface Token {
  id: number
  name: string
  description: string
  imageUrl: string
  artistName: string
  price: string
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
    name: "Digital Dreams #1",
    description: "A mesmerizing piece of digital art",
    imageUrl: "https://picsum.photos/800/600",
    artistName: "AI Artist",
    price: "0.1 ETH",
    social: {
      twitter: 'twitter.com/digitalrenaissance',
      discord: 'discord.gg/digitalrenaissance',
      website: 'digitalrenaissance.art'
    }
  },
  {
    id: 2,
    name: "Sound Wave #1",
    description: "A symphony of digital sound",
    imageUrl: "https://picsum.photos/800/601",
    artistName: "Sound Artist",
    price: "0.1 ETH",
    social: {
      twitter: 'twitter.com/soundwave',
      discord: 'discord.gg/soundwave',
      website: 'soundwavetoken.xyz'
    }
  },
  {
    id: 3,
    name: "Urban Canvas #1",
    description: "Street art meets digital world",
    imageUrl: "https://picsum.photos/800/602",
    artistName: "Urban Artist",
    price: "0.1 ETH",
    social: {
      twitter: 'twitter.com/urbancanvas',
      discord: 'discord.gg/urbancanvas',
      website: 'urbancanvas.art'
    }
  },
  {
    id: 4,
    name: "Digital Symphony #1",
    description: "An AI-generated musical masterpiece",
    imageUrl: "https://picsum.photos/800/603",
    artistName: "Digital Composer",
    price: "0.15 ETH",
    social: {
      twitter: 'twitter.com/digitalsymphony',
      discord: 'discord.gg/digitalsymphony',
      website: 'digitalsymphony.xyz'
    }
  },
  {
    id: 5,
    name: "Media Matrix #1",
    description: "Interactive digital media experience",
    imageUrl: "https://picsum.photos/800/604",
    artistName: "Media Artist",
    price: "0.2 ETH",
    social: {
      twitter: 'twitter.com/mediamatrix',
      discord: 'discord.gg/mediamatrix',
      website: 'mediamatrix.art'
    }
  }
]

const MBD_API_URL = process.env.NEXT_PUBLIC_MBD_AI_API_URL
const MBD_API_KEY = process.env.NEXT_PUBLIC_MBD_AI_API_KEY

if (!MBD_API_URL || !MBD_API_KEY) {
  throw new Error('Missing required MBD AI environment variables')
}

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
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

interface RecommendationsResponse {
  tokens: Token[]
  nextPage?: string
}

// Update makeMbdRequest to use generic type
async function makeMbdRequest<T>(endpoint: string, data: any, userId?: string): Promise<T> {
  try {
    // Check rate limit if userId is provided
    if (userId && !checkRateLimit(userId)) {
      logger.warn('Rate limit exceeded', { userId, endpoint }, userId)
      throw new RateLimitError('Rate limit exceeded. Please try again later.')
    }

    logger.debug('Making MBD AI request', { endpoint, data }, userId)

    const response = await fetch(`${MBD_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MBD_API_KEY}`
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.json()
      logger.error('MBD AI API request failed', { 
        status: response.status, 
        error,
        endpoint 
      }, userId)
      throw new MbdApiError(
        error.message || 'MBD AI API request failed',
        response.status,
        error.code
      )
    }

    const result: MbdApiResponse<T> = await response.json()
    
    if (result.error) {
      logger.error('MBD AI API returned error', { 
        error: result.error,
        endpoint 
      }, userId)
      throw new MbdApiError(result.error.message, undefined, result.error.code)
    }

    logger.debug('MBD AI request successful', { endpoint }, userId)
    return result.data
  } catch (error) {
    if (error instanceof MbdApiError) {
      throw error
    }
    logger.error('Failed to communicate with MBD AI API', { 
      error,
      endpoint 
    }, userId)
    throw new MbdApiError('Failed to communicate with MBD AI API')
  }
}

export async function analyzeToken(token: Token, userId?: string) {
  try {
    logger.info('Analyzing token', { tokenId: token.id }, userId)
    
    const contentAnalysis = await makeMbdRequest<ContentAnalysis>('/analyze', {
      token: {
        name: token.name,
        description: token.description,
        imageUrl: token.imageUrl,
        social: token.social
      }
    }, userId)

    const imageAnalysis = await analyzeImage(token.imageUrl, userId)
    const isCulturalToken = determineIfCulturalToken(contentAnalysis, imageAnalysis)
    
    logger.info('Token analysis complete', { 
      tokenId: token.id,
      isCulturalToken,
      category: contentAnalysis.category 
    }, userId)
    
    return {
      ...token,
      metadata: {
        ...token.metadata,
        category: contentAnalysis.category,
        tags: contentAnalysis.tags,
        sentiment: contentAnalysis.sentiment,
        popularity: contentAnalysis.popularity,
        aiScore: contentAnalysis.aiScore,
        isCulturalToken,
        artStyle: imageAnalysis?.artStyle,
        culturalContext: contentAnalysis.culturalContext,
        artistBio: contentAnalysis.artistBio
      }
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error
    }
    logger.error('Error analyzing token', { 
      error,
      tokenId: token.id 
    }, userId)
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

interface TokenWithScore extends Token {
  culturalScore?: number
}

export async function getPersonalizedFeed(userId: string, preferences?: {
  categories?: string[]
  minSentiment?: number
  minPopularity?: number
  prioritizeCulturalTokens?: boolean
}) {
  try {
    const recommendations = await makeMbdRequest<RecommendationsResponse>('/recommendations', {
      userId,
      preferences: {
        categories: preferences?.categories || [],
        minSentiment: preferences?.minSentiment || 0,
        minPopularity: preferences?.minPopularity || 0,
        prioritizeCulturalTokens: preferences?.prioritizeCulturalTokens ?? true
      }
    }, userId)
    
    const tokens: TokenWithScore[] = recommendations.tokens.map((token: Token) => ({
      ...token,
      culturalScore: calculateCulturalScore(token)
    }))

    if (preferences?.prioritizeCulturalTokens) {
      tokens.sort((a: TokenWithScore, b: TokenWithScore) => (b.culturalScore || 0) - (a.culturalScore || 0))
    }
    
    return tokens
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error
    }
    console.error('Error getting personalized feed:', error)
    return tokenDatabase
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

export async function validateFrameRequest(req: NextRequest) {
  try {
    const body = await req.json()
    const isValid = body && typeof body === 'object' && 'untrustedData' in body
    return {
      isValid,
      message: isValid ? {
        button: body.untrustedData?.buttonIndex || 0,
        inputText: body.untrustedData?.text || '',
        fid: body.untrustedData?.fid
      } : null
    }
  } catch (error) {
    console.error('Error validating frame request:', error)
    return { isValid: false, message: null }
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