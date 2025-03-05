import { useEffect, useState, useCallback, useRef } from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSendTransaction,
  useConfig
} from 'wagmi'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { sendMessage } from '@/utils/agentkit'
import { getTrendingFeed } from '@/utils/mbdAi'
import type { TokenItem } from '@/types/token'
import sdk from '@farcaster/frame-sdk'

// Use the SDK's FrameContext type
type UserContext = {
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
}

interface TokenMetadata {
  authorFid?: string
  authorUsername?: string
  timestamp?: number
  likes?: number
  recasts?: number
  contractAddress?: string
  category?: string
  tags?: string[]
  sentiment?: number
  popularity?: number
  aiScore?: number
  isCulturalToken?: boolean
  artistName?: string
  culturalScore?: number
  tokenType?: 'ERC20' | 'ERC721'
}

export default function Demo() {
  const config = useConfig()
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<UserContext | null>(null)
  const [ethAmount, setEthAmount] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isContextOpen, setIsContextOpen] = useState(false)
  const [tokens, setTokens] = useState<TokenItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | undefined>()
  const feedEndRef = useRef<HTMLDivElement>(null)

  // Wagmi hooks
  const { address, isConnected } = useAccount()
  const { connect: connectWallet } = useConnect()
  const { disconnect } = useDisconnect()
  const {
    sendTransaction,
    error: sendTxError,
    isError: isSendTxError,
    isPending: isSendTxPending,
  } = useSendTransaction()

  // Load SDK and initial data
  useEffect(() => {
    const load = async () => {
      try {
        if (!sdk) throw new Error('SDK not loaded')
        await new Promise(resolve => setTimeout(resolve, 100))
        
        const ctx = await sdk.context
        setContext(ctx?.user || null)
        sdk.actions.ready()

        // Only load initial data if we have a valid FID
        if (ctx?.user?.fid) {
          await loadInitialData(ctx.user.fid)
        } else {
          // Load anonymous data
          await loadInitialData()
        }
        
        setIsSDKLoaded(true)
      } catch (err) {
        console.error('Failed to initialize:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize')
        setIsSDKLoaded(true)
      }
    }
    load()
  }, [])

  // Load initial data using agent
  const loadInitialData = async (fid?: number) => {
    setIsLoading(true)
    try {
      // Try to get recommendations first
      let hasData = false
      
      if (fid) {
        try {
          const response = await sendMessage({
            message: 'Please recommend some trending cultural tokens based on Farcaster activity',
            userId: fid.toString(),
            context: {
              userPreferences: {
                interests: ['art', 'music', 'culture']
              }
            }
          })

          if (response.metadata?.tokenRecommendations) {
            setTokens(response.metadata.tokenRecommendations)
            hasData = true
          }
        } catch (e) {
          console.error('Failed to get recommendations:', e)
        }
      }

      // Fallback to trending feed if no recommendations
      if (!hasData) {
        const trendingFeed = await getTrendingFeed()
        if (trendingFeed.casts) {
          const newTokens = trendingFeed.casts.map(cast => ({
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
        }
        
        if (trendingFeed.next?.cursor) {
          setCursor(trendingFeed.next.cursor)
          setHasMore(true)
        }
      }
    } catch (error) {
      console.error('Failed to load initial data:', error)
      setError('Failed to load recommendations')
      setTokens([]) // Set empty array to show error state
    } finally {
      setIsLoading(false)
    }
  }

  // Token amount calculation helper
  const calculateTokenAmount = useCallback((ethAmt: string, tokenPrice: number) => {
    const eth = parseFloat(ethAmt)
    if (isNaN(eth)) return '0'
    return (eth / tokenPrice).toFixed(2)
  }, [])

  // Load more data
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore || !cursor) return

    setIsLoading(true)
    try {
      const feed = await getTrendingFeed(cursor)
      if (feed.casts) {
        const newTokens = feed.casts.map(cast => ({
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
      }
      
      if (feed.next?.cursor) {
        setCursor(feed.next.cursor)
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Failed to load more:', error)
    } finally {
      setIsLoading(false)
    }
  }, [cursor, isLoading, hasMore])

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

  // Buy action
  const handleBuy = useCallback((token: TokenItem) => {
    if (!isConnected) {
      connectWallet({
        connector: config.connectors[0]
      })
      return
    }

    const contractAddress = token.social?.website || process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS
    if (!contractAddress) {
      setError('No contract address available for this token')
      return
    }

    if (sdk.actions) {
      sdk.actions.openUrl(`https://base.org/swap?token=${token.id}&amount=${ethAmount}`)
    } else {
      sendTransaction({
        to: contractAddress as `0x${string}`,
        value: BigInt(ethAmount),
        data: '0x'
      })
    }
  }, [ethAmount, isConnected, connectWallet, sendTransaction, config.connectors])

  // Share action
  const handleShare = useCallback((token: TokenItem) => {
    if (sdk.actions) {
      sdk.actions.openUrl(`https://warpcast.com/~/compose?text=Check out ${token.name} (${token.symbol})`)
    } else {
      const shareUrl = `https://warpcast.com/~/compose?text=Check out ${token.name} (${token.symbol})`
      window.open(shareUrl, '_blank')
    }
  }, [])

  const toggleContext = useCallback(() => {
    setIsContextOpen((prev) => !prev)
  }, [])

  if (!isSDKLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        {error}
      </div>
    )
  }

  return (
    <div className="w-[300px] mx-auto py-4 px-2">
      <h1 className="text-2xl font-bold text-center mb-4">Prism Frame</h1>
      
      {/* Context Display */}
      <div className="mb-4">
        <h2 className="font-2xl font-bold">Context</h2>
        <button
          onClick={toggleContext}
          className="flex items-center gap-2 transition-colors"
        >
          <span className={`transform transition-transform ${isContextOpen ? 'rotate-90' : ''}`}>
            ➤
          </span>
          Tap to expand
        </button>

        {isContextOpen && context && (
          <div className="p-4 mt-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <pre className="font-mono text-xs whitespace-pre-wrap break-words max-w-[260px]">
              {JSON.stringify(context, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Token Feed */}
      <div className="space-y-4">
        {tokens.map((token: TokenItem) => (
          <div 
            key={token.id} 
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-all hover:shadow-lg"
          >
            {/* Token Image */}
            <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg mb-4 flex items-center justify-center">
              {token.image ? (
                <img 
                  src={token.image} 
                  alt={token.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <span className="text-gray-500 dark:text-gray-400">{token.symbol}</span>
              )}
            </div>

            {/* Token Info */}
            <div className="space-y-2">
              <h2 className="font-bold text-lg">{token.name}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">{token.description}</p>
              <p className="text-sm font-medium">
                1 ETH = {calculateTokenAmount('1', token.price)} {token.symbol}
              </p>
            </div>

            {/* Buy Input */}
            <div className="mt-4 space-y-2">
              <input
                type="number"
                placeholder="ETH Amount"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
                min="0"
                step="0.01"
              />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                ≈ {calculateTokenAmount(ethAmount, token.price)} {token.symbol}
              </p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button 
                onClick={() => handleBuy(token)} 
                variant="default"
                disabled={isSendTxPending}
              >
                {isSendTxPending ? 'Buying...' : isConnected ? 'Buy' : 'Connect'}
              </Button>
              <Button onClick={() => handleShare(token)} variant="secondary">Share</Button>
            </div>

            {sendTxError && (
              <p className="text-red-500 text-sm mt-2">{sendTxError.message}</p>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="py-4 flex justify-center">
            <LoadingSpinner />
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={feedEndRef} className="h-4" />
      </div>
    </div>
  )
} 