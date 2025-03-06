'use client'

import { useState, useEffect } from 'react'
import { logger } from '@/utils/logger'
import { sendMessage } from '@/utils/agentkit'
import { getPersonalizedFeed } from '@/utils/feed'
import type { TokenItem } from '@/types/token'
import type { Cast } from '@/utils/mbdAi'
import { TokenGallery } from '@/components/TokenGallery'

interface FeedProps {
  fid?: number
  onShare?: (token: TokenItem) => void
  onBuy?: (token: TokenItem) => void
}

export function Feed({ fid, onShare, onBuy }: FeedProps) {
  const [tokens, setTokens] = useState<TokenItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    const loadInitialTokens = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (!fid) {
          throw new Error('User FID required for personalized feed')
        }

        // Get personalized feed with AI agent recommendations
        const feed = await getPersonalizedFeed(fid.toString())
        
        if (!feed?.casts?.length) {
          throw new Error('No tokens found in feed')
        }

        const feedTokens = feed.casts.map((cast: Cast) => ({
          id: cast.hash,
          name: cast.author.username,
          symbol: cast.aiAnalysis?.category || 'ART',
          description: cast.text,
          imageUrl: cast.author.pfp || 'https://placehold.co/300x300.png',
          price: 0.1, // Number type as required by TokenItem
          culturalScore: cast.aiAnalysis?.aiScore || 0.8
        }))

        setTokens(feedTokens)
        setCursor(feed.next?.cursor || null)
        setHasMore(!!feed.next?.cursor)
      } catch (error) {
        logger.error('Error loading personalized tokens:', error)
        setError(error instanceof Error ? error.message : 'Failed to load personalized tokens')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialTokens()
  }, [fid])

  const loadMoreTokens = async () => {
    if (!fid || !cursor || !hasMore || isLoading) return

    try {
      setIsLoading(true)
      const feed = await getPersonalizedFeed(fid.toString(), cursor)

      if (!feed?.casts?.length) {
        setHasMore(false)
        return
      }

      const newTokens = feed.casts.map((cast: Cast) => ({
        id: cast.hash,
        name: cast.author.username,
        symbol: cast.aiAnalysis?.category || 'ART',
        description: cast.text,
        imageUrl: cast.author.pfp || 'https://placehold.co/300x300.png',
        price: 0.1, // Number type as required by TokenItem
        culturalScore: cast.aiAnalysis?.aiScore || 0.8
      }))

      setTokens(prev => [...prev, ...newTokens])
      setCursor(feed.next?.cursor || null)
      setHasMore(!!feed.next?.cursor)
    } catch (error) {
      logger.error('Error loading more tokens:', error)
      setError(error instanceof Error ? error.message : 'Failed to load more tokens')
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = (token: TokenItem) => {
    if (onShare) onShare(token)
  }

  const handleBuy = (token: TokenItem) => {
    if (onBuy) onBuy(token)
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>
  }

  return (
    <TokenGallery
      tokens={tokens}
      isLoading={isLoading}
      hasMore={hasMore}
      onLoadMore={loadMoreTokens}
      onShare={handleShare}
      onBuy={handleBuy}
    />
  )
} 