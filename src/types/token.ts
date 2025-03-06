import { Token as MbdToken } from '@/utils/mbdAi'

export interface TokenItem {
  id: string
  name: string
  symbol: string
  description: string
  price: number
  image?: string
  imageUrl?: string
  artistName?: string
  culturalScore?: number
  tokenType?: 'ERC20'
  timestamp?: number
  score?: number
  category?: string
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
    artistName?: string
    culturalScore?: number
    tokenType?: string
    authorFid?: string
    authorUsername?: string
    timestamp?: number
    likes?: number
    recasts?: number
  }
}

export interface TokenFeed {
  tokens: TokenItem[]
  next?: {
    cursor: string
  }
}

// Type alias for backward compatibility
export type Token = TokenItem 

export interface TokenMention {
  tokenId: string
  category?: string
  socialContext?: {
    mentions: number
    reactions: number
  }
  culturalScore?: number
  analysis?: MbdToken
}

export interface TokenAnalysis {
  tokenId: string
  category?: string
  analysis: MbdToken
  culturalScore: number
  socialContext: {
    mentions: number
    reactions: number
  }
}

export type EnhancedTokenMention = TokenMention | TokenAnalysis 