'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { getTrendingFeed, type Cast as MbdCast } from '@/utils/mbdAi'
import { TokenGallery } from '@/components/TokenGallery'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { TokenItem } from '@/types/token'

interface FeedProps {
  fid?: number
  onShare: (token: TokenItem) => void
  onBuy: (token: TokenItem) => void
}

export function Feed({ fid, onShare, onBuy }: FeedProps) {
  const [tokens, setTokens] = useState<TokenItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const feedEndRef = useRef<HTMLDivElement>(null)

  // Load initial tokens
  useEffect(() => {
    const loadInitialTokens = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await getTrendingFeed()
        if (response?.casts) {
          const newTokens = response.casts.map((cast: MbdCast) => ({
            id: cast.hash,
            name: cast.text.split('\n')[0] || 'Untitled Token',
            symbol: cast.text.match(/\$([A-Z]+)/)?.[1] || 'TOKEN',
            description: cast.text,
            price: 0.001,
            image: cast.author.pfp,
            category: 'cultural',
            social: {
              website: process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS
            },
            metadata: {
              authorFid: String(cast.author.fid),
              authorUsername: cast.author.username,
              timestamp: Number(cast.timestamp),
              likes: cast.reactions.likes,
              recasts: cast.reactions.recasts
            }
          }))
          setTokens(newTokens)
          setCursor(response.next?.cursor)
          setHasMore(!!response.next?.cursor)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tokens')
        console.error('Error loading initial tokens:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialTokens()
  }, [fid])

  // Load more tokens
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || !cursor) return
    
    try {
      setIsLoading(true)
      setError(null)
      const response = await getTrendingFeed(cursor)
      if (response?.casts) {
        const newTokens = response.casts.map((cast: MbdCast) => ({
          id: cast.hash,
          name: cast.text.split('\n')[0] || 'Untitled Token',
          symbol: cast.text.match(/\$([A-Z]+)/)?.[1] || 'TOKEN',
          description: cast.text,
          price: 0.001,
          image: cast.author.pfp,
          category: 'cultural',
          social: {
            website: process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS
          },
          metadata: {
            authorFid: String(cast.author.fid),
            authorUsername: cast.author.username,
            timestamp: Number(cast.timestamp),
            likes: cast.reactions.likes,
            recasts: cast.reactions.recasts
          }
        }))
        setTokens(prev => [...prev, ...newTokens])
        setCursor(response.next?.cursor)
        setHasMore(!!response.next?.cursor)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more tokens')
      console.error('Error loading more tokens:', err)
    } finally {
      setIsLoading(false)
    }
  }, [cursor, hasMore, isLoading])

  // Infinite scroll
  useEffect(() => {
    if (!feedEndRef.current || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore()
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(feedEndRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoading, loadMore])

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>
  }

  return (
    <>
      <TokenGallery 
        tokens={tokens}
        onShare={onShare}
        onBuy={onBuy}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
      {isLoading && <LoadingSpinner />}
      <div ref={feedEndRef} />
    </>
  )
} 