import { useEffect, useState, useCallback, useRef } from 'react'
import sdk from '@farcaster/frame-sdk'
import { Button } from './ui/Button'
import { LoadingSpinner } from './ui/LoadingSpinner'
import { useFeed, type TokenItem } from '../hooks/useFeed'

export default function Demo() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<any>(null)
  const [ethAmount, setEthAmount] = useState<string>('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const feedEndRef = useRef<HTMLDivElement>(null)

  const {
    tokens,
    isLoading,
    hasMore,
    refresh,
    loadMore
  } = useFeed()

  useEffect(() => {
    async function load() {
      try {
        if (!sdk) throw new Error('SDK not loaded')
        await new Promise(resolve => setTimeout(resolve, 100))
        const ctx = await sdk.context
        setContext(ctx)
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
      sdk.actions.openUrl(`https://warpcast.com/~/compose?text=Check out ${token.symbol}! A great culture token: ${token.description}`)
    }
  }, [])

  if (error) return (
    <div className="w-[300px] mx-auto py-4 px-2">
      <div className="text-red-500">Error: {error}</div>
    </div>
  )
  
  if (!isSDKLoaded) return (
    <div className="w-[300px] mx-auto py-4 px-2">
      <div>Loading SDK...</div>
    </div>
  )

  return (
    <div className="w-[300px] mx-auto py-4 px-2">
      <h1 className="text-2xl font-bold text-center mb-4">Culture Tokens</h1>
      
      {/* Pull to refresh indicator */}
      {isRefreshing && (
        <div className="py-2 text-center">
          <LoadingSpinner />
        </div>
      )}

      {/* Token Feed */}
      <div className="space-y-4">
        {tokens.map(token => (
          <div 
            key={token.id} 
            className="bg-white rounded-lg shadow p-4 transition-all hover:shadow-lg"
          >
            {/* Token Image */}
            <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
              <span className="text-gray-500">{token.symbol}</span>
            </div>

            {/* Token Info */}
            <div className="space-y-2">
              <h2 className="font-bold text-lg">{token.name}</h2>
              <p className="text-sm text-gray-600">{token.description}</p>
              <p className="text-sm font-medium">1 ETH = {(1/token.price).toFixed(0)} {token.symbol}</p>
            </div>

            {/* Buy Input */}
            <div className="mt-4 space-y-2">
              <input
                type="number"
                placeholder="ETH Amount"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
                min="0"
                step="0.01"
              />
              <p className="text-sm text-gray-600">
                ≈ {calculateTokenAmount(ethAmount, token.price)} {token.symbol}
              </p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button onClick={() => handleBuy(token)} variant="primary">Buy</Button>
              <Button onClick={() => handleShare(token)} variant="secondary">Share</Button>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="py-4">
            <LoadingSpinner />
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={feedEndRef} className="h-4" />
      </div>

      {/* Debug: Context */}
      <div className="mt-8 border-t pt-4">
        <h2 className="text-sm font-bold mb-2">Debug: Frame Context</h2>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
          {JSON.stringify(context, null, 2)}
        </pre>
      </div>
    </div>
  )
} 