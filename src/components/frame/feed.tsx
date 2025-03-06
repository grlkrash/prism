'use client'

import { useState, useEffect } from 'react'
import { logger } from '@/utils/logger'
import { sendMessage } from '@/utils/agentkit'
import { getPersonalizedFeed } from '@/utils/feed'
import type { TokenItem } from '@/types/token'
import type { Cast } from '@/utils/mbdAi'
import { TokenGallery } from '@/components/TokenGallery'
import { tokenDatabase } from '@/utils/mbdAi'

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
          // If no FID, show initial curated tokens from database
          const initialTokens: TokenItem[] = tokenDatabase.map(token => ({
            id: token.id.toString(),
            name: token.name,
            symbol: token.symbol,
            description: token.description,
            price: typeof token.price === 'string' ? parseFloat(token.price) : token.price,
            imageUrl: token.imageUrl,
            artistName: token.artistName,
            culturalScore: token.culturalScore,
            metadata: {
              ...token.metadata,
              category: token.metadata?.category || token.aiAnalysis?.category,
              aiScore: token.aiAnalysis?.aiScore,
              authorFid: token.id.toString(),
              authorUsername: token.artistName,
              timestamp: Date.now()
            },
            social: token.social
          }))
          setTokens(initialTokens)
          setHasMore(false)
          return
        }

        // Get personalized feed with AI agent recommendations
        const feed = await getPersonalizedFeed(fid.toString())
        
        if (!feed?.casts?.length) {
          const initialTokens: TokenItem[] = tokenDatabase.map(token => ({
            id: token.id.toString(),
            name: token.name,
            symbol: token.symbol,
            description: token.description,
            price: typeof token.price === 'string' ? parseFloat(token.price) : token.price,
            imageUrl: token.imageUrl,
            artistName: token.artistName,
            culturalScore: token.culturalScore,
            metadata: {
              ...token.metadata,
              category: token.metadata?.category || token.aiAnalysis?.category,
              aiScore: token.aiAnalysis?.aiScore,
              authorFid: token.id.toString(),
              authorUsername: token.artistName,
              timestamp: Date.now()
            },
            social: token.social
          }))
          setTokens(initialTokens)
          setHasMore(false)
          return
        }

        const feedTokens = feed.casts.map((cast: Cast) => ({
          id: cast.hash,
          name: cast.author.username,
          symbol: cast.aiAnalysis?.category || 'ART',
          description: cast.text,
          imageUrl: cast.author.pfp || 'https://placehold.co/300x300.png',
          price: 0.1,
          culturalScore: cast.aiAnalysis?.aiScore || 0.8,
          metadata: {
            authorFid: cast.author.fid.toString(),
            authorUsername: cast.author.username,
            timestamp: new Date(cast.timestamp).getTime(),
            category: cast.aiAnalysis?.category,
            aiScore: cast.aiAnalysis?.aiScore,
            likes: cast.reactions.likes,
            recasts: cast.reactions.recasts
          }
        }))

        setTokens(feedTokens)
        setCursor(feed.next?.cursor || null)
        setHasMore(!!feed.next?.cursor)
      } catch (error) {
        logger.error('Error loading tokens:', error)
        setError(error instanceof Error ? error.message : 'Failed to load tokens')
        // Fallback to curated tokens on error
        const initialTokens: TokenItem[] = tokenDatabase.map(token => ({
          id: token.id.toString(),
          name: token.name,
          symbol: token.symbol,
          description: token.description,
          price: typeof token.price === 'string' ? parseFloat(token.price) : token.price,
          imageUrl: token.imageUrl,
          artistName: token.artistName,
          culturalScore: token.culturalScore,
          metadata: {
            ...token.metadata,
            category: token.metadata?.category || token.aiAnalysis?.category,
            aiScore: token.aiAnalysis?.aiScore,
            authorFid: token.id.toString(),
            authorUsername: token.artistName,
            timestamp: Date.now()
          },
          social: token.social
        }))
        setTokens(initialTokens)
        setHasMore(false)
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
        price: 0.1,
        culturalScore: cast.aiAnalysis?.aiScore || 0.8,
        metadata: {
          authorFid: cast.author.fid.toString(),
          authorUsername: cast.author.username,
          timestamp: new Date(cast.timestamp).getTime(),
          category: cast.aiAnalysis?.category,
          aiScore: cast.aiAnalysis?.aiScore,
          likes: cast.reactions.likes,
          recasts: cast.reactions.recasts
        }
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
      <div>
        <div className="text-red-500 p-4 mb-4">{error}</div>
        <TokenGallery
          tokens={tokens}
          isLoading={isLoading}
          hasMore={false}
          onLoadMore={loadMoreTokens}
          onShare={handleShare}
          onBuy={handleBuy}
        />
      </div>
    )
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