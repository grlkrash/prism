import { useState, useCallback, useEffect } from 'react'

export interface TokenItem {
  id: string
  name: string
  description: string
  symbol: string
  price: number
  image?: string
  timestamp: number // For feed sorting
  score?: number // For AI curation
}

interface UseFeedReturn {
  tokens: TokenItem[]
  isLoading: boolean
  isRefreshing: boolean
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

  // Mock data generator - will be replaced with real API calls
  const fetchTokens = async (pageNum: number) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Simulate pagination end after 3 pages
    if (pageNum > 3) {
      return []
    }
    
    const mockTokens: TokenItem[] = [
      {
        id: `0x123${pageNum}`,
        name: 'Digital Culture DAO',
        symbol: 'DCULT',
        description: 'Community-driven cultural preservation token',
        price: 0.001,
        timestamp: Date.now() - (pageNum * 1000),
        score: 0.95
      },
      {
        id: `0x456${pageNum}`,
        name: 'Art Collective Token',
        symbol: 'ARTCOL',
        description: 'Empowering digital artists worldwide',
        price: 0.002,
        timestamp: Date.now() - (pageNum * 2000),
        score: 0.88
      }
    ]
    
    return mockTokens
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
    if (isLoading || isRefreshing || !hasMore) return

    try {
      setIsLoading(true)
      const nextTokens = await fetchTokens(page + 1)
      
      if (nextTokens.length === 0) {
        setHasMore(false)
        return
      }

      setTokens(prev => [...prev, ...nextTokens])
      setPage(prev => prev + 1)
    } catch (error) {
      console.error('Failed to load more tokens:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, isRefreshing, hasMore, page])

  // Initial load
  useEffect(() => {
    if (isInitialLoad) {
      refresh()
    }
  }, [refresh, isInitialLoad])

  return {
    tokens,
    isLoading: isInitialLoad || isLoading,
    isRefreshing,
    hasMore,
    refresh,
    loadMore
  }
} 