import { useEffect, useState, useCallback, useRef } from 'react'
import sdk from '@farcaster/frame-sdk'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useFeed, type TokenItem } from '@/hooks/useFeed'

interface FrameContext {
  fid?: number
  username?: string
  displayName?: string
  pfp?: string
  bio?: string
  location?: {
    placeId: string
    description: string
  }
}

export default function Demo() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<FrameContext | null>(null)
  const [ethAmount, setEthAmount] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isContextOpen, setIsContextOpen] = useState(false)
  const feedEndRef = useRef<HTMLDivElement>(null)

  const {
    tokens,
    isLoading,
    hasMore,
    refresh,
    loadMore
  } = useFeed()

  useEffect(() => {
    const load = async () => {
      try {
        if (!sdk) throw new Error('SDK not loaded')
        await new Promise(resolve => setTimeout(resolve, 100))
        
        const ctx = await sdk.context
        setContext(ctx?.user || null)
        
        if (sdk.actions) {
          await sdk.actions.ready()
          setIsSDKLoaded(true)
        } else {
          throw new Error('SDK actions not available')
        }
      } catch (err) {
        console.error('Failed to initialize SDK:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize SDK')
      }
    }
    load()
  }, [])

  // Infinite scroll observer
  useEffect(() => {
    if (!feedEndRef.current) return

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

  const handlePullToRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refresh()
    setIsRefreshing(false)
  }, [refresh])

  const calculateTokenAmount = (ethAmt: string, tokenPrice: number) => {
    const eth = parseFloat(ethAmt)
    if (isNaN(eth)) return '0'
    return (eth / tokenPrice).toFixed(2)
  }

  const handleBuy = useCallback((token: TokenItem) => {
    if (sdk.actions) {
      sdk.actions.openUrl(`https://base.org/swap?token=${token.id}&amount=${ethAmount}`)
    }
  }, [ethAmount])

  const handleShare = useCallback((token: TokenItem) => {
    if (sdk.actions) {
      sdk.actions.openUrl(`https://warpcast.com/~/compose?text=Check out ${token.name} (${token.symbol})`)
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
              <span className="text-gray-500 dark:text-gray-400">{token.symbol}</span>
            </div>

            {/* Token Info */}
            <div className="space-y-2">
              <h2 className="font-bold text-lg">{token.name}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">{token.description}</p>
              <p className="text-sm font-medium">1 ETH = {(1/token.price).toFixed(0)} {token.symbol}</p>
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
              <Button onClick={() => handleBuy(token)} variant="default">Buy</Button>
              <Button onClick={() => handleShare(token)} variant="secondary">Share</Button>
            </div>
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