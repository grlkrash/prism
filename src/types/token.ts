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