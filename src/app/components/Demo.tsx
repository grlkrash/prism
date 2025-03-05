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
import { getTrendingFeed, analyzeToken, type Cast as MbdCast } from '@/utils/mbdAi'
import type { TokenItem } from '@/types/token'
import sdk from '@farcaster/frame-sdk'
import CuratorLeaderboard from '@/components/SocialFi'
import { TokenGallery } from '@/components/TokenGallery'
import { AgentChat } from '@/components/agent/agent-chat'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MBD_AI_CONFIG } from '@/config/mbdAi'

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

interface Cast {
  hash: string
  threadHash?: string
  parentHash?: string
  author: {
    fid: number
    username: string
    displayName?: string
    pfp?: string
    bio?: string
  }
  text: string
  timestamp: string
  reactions: {
    likes: number
    recasts: number
  }
  replies?: {
    count: number
  }
  viewerContext?: {
    liked: boolean
    recasted: boolean
  }
  labels?: string[]
  aiAnalysis?: {
    category: string
    sentiment: number
    popularity: number
    aiScore: number
    culturalContext: string
    artStyle?: string
    isArtwork?: boolean
    hasCulturalElements?: boolean
  }
  metadata?: {
    culturalScore?: number
  }
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
    setError(null)
    let hasData = false

    try {
      // 1. Try AI Agent + LangChain + OpenAI first
      console.log('[Demo] Starting AI-powered token discovery')
      if (fid) {
        try {
          console.log('[Demo] Using AI agent for personalized recommendations')
          const agentResponse = await sendMessage({
            message: 'Please analyze and recommend cultural tokens, focusing on art, music, and creative content. Use cultural scoring and sentiment analysis.',
            userId: fid.toString(),
            context: {
              userPreferences: {
                interests: ['art', 'music', 'culture'],
                filters: {
                  minScore: MBD_AI_CONFIG.CULTURAL_TOKEN.MIN_CONTENT_SCORE,
                  categories: MBD_AI_CONFIG.CULTURAL_TOKEN.INDICATORS.CONTENT
                }
              }
            }
          })

          if (agentResponse.metadata?.tokenRecommendations?.length > 0) {
            console.log('[Demo] AI agent found recommendations:', agentResponse.metadata.tokenRecommendations.length)
            setTokens(agentResponse.metadata.tokenRecommendations)
            hasData = true
          } else {
            console.log('[Demo] AI agent returned no recommendations, trying MBD AI filtering')
          }
        } catch (agentError) {
          console.error('[Demo] AI agent error:', agentError)
          // Don't throw, try MBD AI filtering next
        }
      }

      // 2. Try MBD AI with cultural filtering if agent recommendations failed
      if (!hasData) {
        try {
          console.log('[Demo] Using MBD AI for cultural token filtering')
          const response = await fetch('/api/mbd?endpoint=/v2/discover-actions', {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          })

          if (!response.ok) {
            throw new Error(`MBD AI request failed: ${response.status} ${response.statusText}`)
          }

          const data = await response.json()
          
          if (!data?.casts) {
            throw new Error('Invalid MBD AI response format')
          }

          // Filter for cultural tokens using AI analysis
          const culturalTokens = data.casts.filter((cast: MbdCast) => {
            const analysis = cast.aiAnalysis
            return analysis?.hasCulturalElements || 
                   analysis?.category?.toLowerCase().includes('art') ||
                   analysis?.category?.toLowerCase().includes('music') ||
                   analysis?.category?.toLowerCase().includes('culture')
          })

          if (culturalTokens.length > 0) {
            console.log('[Demo] Found cultural tokens through MBD AI:', culturalTokens.length)
            const processedTokens = await Promise.all(
              culturalTokens.map(async (cast: MbdCast) => {
                try {
                  // Process token with additional AI analysis
                  const token = {
                    id: cast.hash,
                    name: cast.text.split('\n')[0] || 'Untitled Token',
                    symbol: cast.text.match(/\$([A-Z]+)/)?.[1] || 'TOKEN',
                    description: cast.text,
                    price: 0.001,
                    image: cast.author.pfp,
                    category: cast.aiAnalysis?.category || 'cultural',
                    social: {
                      website: process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS
                    },
                    metadata: {
                      authorFid: String(cast.author.fid),
                      authorUsername: cast.author.username,
                      timestamp: Number(cast.timestamp),
                      likes: cast.reactions.likes,
                      recasts: cast.reactions.recasts,
                      category: cast.aiAnalysis?.category,
                      tags: cast.labels,
                      sentiment: cast.aiAnalysis?.sentiment,
                      popularity: cast.aiAnalysis?.popularity,
                      aiScore: cast.aiAnalysis?.aiScore,
                      isCulturalToken: true,
                      artStyle: cast.aiAnalysis?.artStyle,
                      culturalContext: cast.aiAnalysis?.culturalContext
                    }
                  }

                  // Enhance with AI agent analysis
                  try {
                    const analysis = await sendMessage({
                      message: `Analyze cultural significance: ${token.name} (${token.symbol}) - ${token.description}`,
                      userId: fid?.toString(),
                      context: { currentToken: token }
                    })

                    if (analysis.metadata?.tokenRecommendations?.[0]) {
                      return {
                        ...token,
                        culturalScore: analysis.metadata.tokenRecommendations[0].culturalScore,
                        metadata: {
                          ...token.metadata,
                          ...analysis.metadata.tokenRecommendations[0].metadata
                        }
                      }
                    }
                  } catch (analysisError) {
                    console.error('[Demo] Token analysis error:', analysisError)
                  }
                  
                  return token
                } catch (error) {
                  console.error('[Demo] Error processing token:', error)
                  return null
                }
              })
            )

            const validTokens = processedTokens.filter((token): token is TokenItem => token !== null)
            if (validTokens.length > 0) {
              setTokens(validTokens)
              hasData = true
            }
          }
        } catch (mbdError) {
          console.error('[Demo] MBD AI error:', mbdError)
          // Don't throw, try fallback data
        }
      }

      // 3. Use fallback cultural token data if all else fails
      if (!hasData) {
        console.log('[Demo] Using fallback cultural token data')
        // Use the pre-defined cultural tokens from the database
        const fallbackTokens = tokenDatabase.filter(token => 
          token.metadata?.isCulturalToken || 
          token.metadata?.category?.toLowerCase().includes('art') ||
          token.metadata?.category?.toLowerCase().includes('music') ||
          token.metadata?.category?.toLowerCase().includes('culture')
        )
        
        if (fallbackTokens.length > 0) {
          setTokens(fallbackTokens)
          hasData = true
        } else {
          throw new Error('No cultural tokens available')
        }
      }
    } catch (error) {
      console.error('[Demo] Failed to load cultural tokens:', error)
      setError(error instanceof Error ? error.message : 'Failed to load cultural tokens')
      setTokens([])
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
        const newTokens = feed.casts.map((cast: MbdCast) => ({
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

    if (isSDKLoaded && context?.fid) {
      loadInitialTokens()
    }
  }, [isSDKLoaded, context])

  // Load more tokens
  const loadMoreTokens = useCallback(async () => {
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
          <TokenGallery 
            tokens={tokens}
            isLoading={isLoading}
            hasMore={hasMore}
            onLoadMore={loadMoreTokens}
          />
        </TabsContent>

        <TabsContent value="curator">
          <CuratorLeaderboard 
            userId={context?.fid?.toString()} 
            onCollect={(tokenId) => handleBuy(tokens.find(t => t.id === tokenId)!)}
          />
        </TabsContent>

        <TabsContent value="friends">
          <TokenGallery 
            userId={context?.fid?.toString()}
            tokens={tokens.filter(t => t.metadata?.authorFid === context?.fid?.toString())}
            isLoading={isLoading}
            hasMore={false}
            onLoadMore={async () => {}}
          />
        </TabsContent>

        <TabsContent value="chat">
          <AgentChat />
        </TabsContent>
      </Tabs>
    </div>
  )
} 