export interface TokenItem {
  id: string
  name: string
  symbol: string
  description: string
  price: number
  image?: string
  category?: string
  metadata?: {
    [key: string]: any
  }
}

export interface TokenFeed {
  tokens: TokenItem[]
  next?: {
    cursor: string
  }
} 