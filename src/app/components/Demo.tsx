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
import CuratorLeaderboard from '@/components/SocialFi'
import { TokenGallery } from '@/components/TokenGallery'
import { AgentChat } from '@/components/agent/agent-chat'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

interface FriendActivity {
  userId: string
  username: string
  action: 'buy' | 'sell' | 'share'
  tokenId: string
  timestamp: string
  category?: 'art' | 'music' | 'culture' | 'media' | 'entertainment'
  culturalContext?: string
}

interface Referral {
  userId: string
  referredId: string
  reward: number
  timestamp: string
  status: 'pending' | 'completed'
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
  const [activeTab, setActiveTab] = useState('feed')
  const [friendActivities, setFriendActivities] = useState<FriendActivity[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])

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

  // Load friend activities
  const loadFriendActivities = useCallback(async () => {
    if (!context?.fid) return
    try {
      const response = await sendMessage({
        message: 'Get friend activities',
        userId: context.fid.toString(),
        context: { type: 'friend_activity' }
      })
      if (response.metadata?.friendActivities) {
        setFriendActivities(response.metadata.friendActivities)
      }
    } catch (error) {
      console.error('Failed to load friend activities:', error)
    }
  }, [context?.fid])

  // Load referrals
  const loadReferrals = useCallback(async () => {
    if (!context?.fid) return
    try {
      const response = await sendMessage({
        message: 'Get referrals',
        userId: context.fid.toString(),
        context: { type: 'referrals' }
      })
      if (response.metadata?.referrals) {
        const mappedReferrals: Referral[] = response.metadata.referrals.map(ref => ({
          userId: ref.referrerId || context.fid.toString(),
          referredId: ref.referredId,
          reward: ref.reward,
          timestamp: ref.timestamp,
          status: 'completed'
        }))
        setReferrals(mappedReferrals)
      }
    } catch (error) {
      console.error('Failed to load referrals:', error)
    }
  }, [context?.fid])

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'friends') loadFriendActivities()
    if (activeTab === 'referrals') loadReferrals()
  }, [activeTab, loadFriendActivities, loadReferrals])

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
    <div className="container mx-auto p-4 space-y-6">
      {/* Context Display */}
      <div className="flex justify-between items-center">
        <Button onClick={toggleContext} variant="outline">
          {isContextOpen ? 'Hide Context' : 'Show Context'}
        </Button>
        {isConnected ? (
          <Button onClick={() => disconnect()}>Disconnect</Button>
        ) : null}
      </div>

      {isContextOpen && context && (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(context, null, 2)}
          </pre>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="curator">Curator</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-4">
          {/* Existing token feed */}
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
            {/* ... existing loading and infinite scroll code ... */}
          </div>
        </TabsContent>

        <TabsContent value="curator">
          <CuratorLeaderboard 
            userId={context?.fid?.toString()} 
            onCollect={(tokenId) => handleBuy(tokens.find(t => t.id === tokenId)!)}
          />
        </TabsContent>

        <TabsContent value="friends">
          <TokenGallery userId={context?.fid?.toString()} />
        </TabsContent>

        <TabsContent value="chat">
          <AgentChat />
        </TabsContent>
      </Tabs>
    </div>
  )
} 