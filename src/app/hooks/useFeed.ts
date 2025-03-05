import { useState, useCallback } from 'react'
import { sendMessage } from '@/utils/agentkit'

export interface TokenItem {
  id: string
  name: string
  symbol: string
  description: string
  price: number
  timestamp: number
  score: number
  imageUrl?: string
  culturalScore?: number
}

interface UseFeedReturn {
  tokens: TokenItem[]
  isLoading: boolean
  hasMore: boolean
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
}

export function useFeed(): UseFeedReturn {
  const [tokens, setTokens] = useState<TokenItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  const fetchTokens = async (pageNum: number) => {
    // Get recommendations from agent with pagination context
    const response = await sendMessage({
      message: 'Please recommend some trending cultural tokens based on Farcaster activity',
      userId: 'feed-view',
      context: {
        pagination: {
          page: pageNum,
          limit: 10
        },
        userPreferences: {
          interests: ['art', 'music', 'culture']
        }
      }
    })

    if (!response.metadata?.tokenRecommendations) {
      return []
    }

    // Map recommendations to TokenItem format
    return response.metadata.tokenRecommendations.map(token => ({
      id: token.id,
      name: token.name,
      symbol: token.symbol,
      description: token.description,
      price: parseFloat(token.price) || 0,
      timestamp: Date.now(),
      score: token.culturalScore / 100,
      imageUrl: token.imageUrl
    }))
  }

  const refresh = useCallback(async () => {
    try {
      setIsRefreshing(true)
      const newTokens = await fetchTokens(1)
      setTokens(newTokens)
      setPage(1)
      setHasMore(newTokens.length > 0)
    } catch (error) {
      console.error('Failed to refresh feed:', error)
    } finally {
      setIsRefreshing(false)
      setIsInitialLoad(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    try {
      setIsLoading(true)
      const nextPage = page + 1
      const newTokens = await fetchTokens(nextPage)
      
      if (newTokens.length === 0) {
        setHasMore(false)
      } else {
        setTokens(prev => [...prev, ...newTokens])
        setPage(nextPage)
      }
    } catch (error) {
      console.error('Failed to load more tokens:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, page])

  // Initial load
  if (isInitialLoad) {
    refresh()
  }

  return {
    tokens,
    isLoading,
    hasMore,
    refresh,
    loadMore
  }
} 