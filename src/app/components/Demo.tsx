import { useEffect, useState, useCallback } from 'react'
import sdk from '@farcaster/frame-sdk'
import { Button } from './ui/Button'

interface TokenItem {
  id: string
  name: string
  description: string
  symbol: string
  price: number // Price in ETH
  image?: string
}

export default function Demo() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<any>(null)
  const [ethAmount, setEthAmount] = useState<string>('')
  const [selectedToken, setSelectedToken] = useState<TokenItem | null>(null)

  // Mock data for culture/art tokens
  const tokens: TokenItem[] = [
    {
      id: '0x123',
      name: 'Digital Culture DAO',
      symbol: 'DCULT',
      description: 'Community-driven cultural preservation token',
      price: 0.001, // 1 ETH = 1000 DCULT
      image: 'https://example.com/dcult.jpg'
    },
    {
      id: '0x456',
      name: 'Art Collective Token',
      symbol: 'ARTCOL',
      description: 'Empowering digital artists worldwide',
      price: 0.002, // 1 ETH = 500 ARTCOL
      image: 'https://example.com/artcol.jpg'
    },
    {
      id: '0x789',
      name: 'Creative Commons Fund',
      symbol: 'CREATE',
      description: 'Supporting open-source creativity',
      price: 0.0005, // 1 ETH = 2000 CREATE
      image: 'https://example.com/create.jpg'
    }
  ]

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

  const calculateTokenAmount = (ethAmt: string, tokenPrice: number) => {
    const eth = parseFloat(ethAmt)
    if (isNaN(eth)) return '0'
    return (eth / tokenPrice).toFixed(2)
  }

  const handleBuy = useCallback((token: TokenItem) => {
    if (sdk.actions) {
      // In real implementation, this would connect to Base for the transaction
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
      
      <div className="space-y-6">
        {tokens.map(token => (
          <div key={token.id} className="bg-white rounded-lg shadow p-4">
            {/* Token Image */}
            <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
              <span className="text-gray-500">{token.symbol}</span>
            </div>

            {/* Token Info */}
            <h2 className="font-bold mb-1">{token.name}</h2>
            <p className="text-sm text-gray-600 mb-2">{token.description}</p>
            <p className="text-sm font-medium mb-4">1 ETH = {(1/token.price).toFixed(0)} {token.symbol}</p>

            {/* Buy Input */}
            <div className="space-y-2 mb-4">
              <input
                type="number"
                placeholder="ETH Amount"
                className="w-full px-3 py-2 border rounded-lg"
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
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => handleBuy(token)} variant="primary">Buy</Button>
              <Button onClick={() => handleShare(token)} variant="secondary">Share</Button>
            </div>
          </div>
        ))}
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