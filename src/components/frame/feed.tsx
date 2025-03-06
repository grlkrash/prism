'use client'

import { useEffect, useState } from 'react'
import { getTrendingFeed } from '@/utils/mbdAi'
import { TokenGallery } from '@/components/TokenGallery'
import { logger } from '@/utils/logger'
import { sendMessage } from '@/utils/agentkit'
import type { TokenItem } from '@/types/token'
import type { Cast } from '@/utils/mbdAi'

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

        // Get agent recommendations if fid exists
        if (fid) {
          try {
            const agentResponse = await sendMessage({
              message: 'Recommend cultural tokens for discovery',
              userId: fid.toString(),
              context: { view: 'feed' }
            })

            if (agentResponse?.recommendations?.length) {
              logger.info('Agent recommendations received:', agentResponse.recommendations.length)
            }
          } catch (agentError) {
            logger.warn('Agent recommendations failed:', agentError)
            // Continue with trending feed even if agent fails
          }
        }

        // Get trending feed
        const feed = await getTrendingFeed()
        
        if (!feed?.casts?.length) {
          throw new Error('No tokens found in feed')
        }

        const feedTokens = feed.casts.map((cast: Cast) => ({
          id: cast.hash,
          name: cast.author.username,
          symbol: cast.aiAnalysis?.category || 'ART',
          description: cast.text,
          imageUrl: cast.author.pfp || 'https://placehold.co/300x300.png',
          price: '0.1',
          culturalScore: cast.aiAnalysis?.aiScore || 0.8
        }))

        setTokens(feedTokens)
        setCursor(feed.next?.cursor || null)
        setHasMore(!!feed.next?.cursor)
      } catch (error) {
        logger.error('Error loading initial tokens:', error)
        setError(error instanceof Error ? error.message : 'Failed to load tokens')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialTokens()
  }, [fid])

  const loadMore = async () => {
    if (!cursor || !hasMore || isLoading) return

    try {
      setIsLoading(true)
      const feed = await getTrendingFeed(cursor)
      
      if (!feed?.casts) {
        throw new Error('Invalid feed response')
      }

      const newTokens = feed.casts.map((cast: Cast) => ({
        id: cast.hash,
        name: cast.author.username,
        symbol: cast.aiAnalysis?.category || 'ART',
        description: cast.text,
        imageUrl: cast.author.pfp || 'https://placehold.co/300x300.png',
        price: '0.1',
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
    return (
      <div className="text-red-500 text-sm p-4">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <TokenGallery
        tokens={tokens}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onShare={handleShare}
        onBuy={handleBuy}
      />
    </div>
  )
} 