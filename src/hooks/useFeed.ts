import { useState, useCallback } from 'react'

export interface TokenItem {
  id: string
  name: string
  symbol: string
  description: string
  price: number
  image?: string
}

export function useFeed() {
  const [tokens, setTokens] = useState<TokenItem[]>([
    {
      id: '1',
      name: 'Example Token 1',
      symbol: 'EX1',
      description: 'An example cultural token',
      price: 0.001,
      image: 'https://placeholder.co/300x200'
    },
    {
      id: '2',
      name: 'Example Token 2',
      symbol: 'EX2',
      description: 'Another example token',
      price: 0.002,
      image: 'https://placeholder.co/300x200'
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const loadMore = useCallback(async () => {
    setIsLoading(true)
    try {
      // TODO: Implement real API call using Warpcast API
      await new Promise(resolve => setTimeout(resolve, 1000))
      setHasMore(false) // For now, no more tokens to load
    } catch (error) {
      console.error('Failed to load more tokens:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      // TODO: Implement real API call using Warpcast API
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Reset tokens to initial state for now
      setTokens([
        {
          id: '1',
          name: 'Example Token 1',
          symbol: 'EX1',
          description: 'An example cultural token',
          price: 0.001,
          image: 'https://placeholder.co/300x200'
        },
        {
          id: '2',
          name: 'Example Token 2',
          symbol: 'EX2',
          description: 'Another example token',
          price: 0.002,
          image: 'https://placeholder.co/300x200'
        }
      ])
    } catch (error) {
      console.error('Failed to refresh tokens:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    tokens,
    isLoading,
    hasMore,
    loadMore,
    refresh
  }
} 