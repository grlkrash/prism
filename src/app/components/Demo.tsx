'use client'

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
import sdk, { type FrameContext } from '@farcaster/frame-sdk'
import CuratorLeaderboard from '@/components/SocialFi'
import { TokenGallery } from '@/components/TokenGallery'
import { AgentChat } from '@/components/agent/agent-chat'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MBD_AI_CONFIG } from '@/config/mbdAi'
import { logger } from '@/utils/logger'

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
  const [context, setContext] = useState<FrameContext>()
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

  useEffect(() => {
    const initializeFrame = async () => {
      try {
        // Wait for SDK to be ready
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Get context first
        const ctx = await sdk.context
        setContext(ctx)
        logger.info('Frame context loaded:', ctx)

        // Signal ready to Warpcast
        await sdk.actions.ready()
        logger.info('Frame ready signal sent')
        
        setIsSDKLoaded(true)
      } catch (error) {
        logger.error('Error initializing frame:', error)
      }
    }

    initializeFrame()
  }, [])

  // Load initial data using agent
  const loadInitialData = async (fid?: number) => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('[Demo] Starting parallel token discovery from AI agent and MBD AI')
      
      // Fetch from both sources in parallel
      const [agentResults, mbdResults] = await Promise.allSettled([
        // 1. AI Agent + LangChain + OpenAI
        fid ? (async () => {
          console.log('[Demo] Requesting AI agent recommendations for FID:', fid)
          const result = await sendMessage({
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
          console.log('[Demo] AI agent response:', {
            success: !!result,
            hasRecommendations: !!result?.metadata?.tokenRecommendations,
            recommendationCount: result?.metadata?.tokenRecommendations?.length || 0,
            firstRecommendation: result?.metadata?.tokenRecommendations?.[0] || null
          })
          return result
        })() : Promise.resolve(null),

        // 2. MBD AI with cultural filtering
        (async () => {
          console.log('[Demo] Requesting MBD AI cultural tokens')
          try {
            const response = await fetch('/api/mbd?endpoint=/v2/discover-actions', {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            })
            
            if (!response.ok) {
              const errorText = await response.text()
              console.error('[Demo] MBD AI request failed:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
              })
              throw new Error(`MBD AI request failed: ${response.status} ${response.statusText}`)
            }
            
            const data = await response.json()
            console.log('[Demo] MBD AI response:', {
              success: response.ok,
              status: response.status,
              hasCasts: !!data?.casts,
              castCount: data?.casts?.length || 0,
              firstCast: data?.casts?.[0] || null
            })
            return data
          } catch (error) {
            console.error('[Demo] MBD AI request error:', error)
            throw error
          }
        })()
      ])

      const combinedTokens: TokenItem[] = []

      // Process AI agent results
      if (agentResults.status === 'fulfilled' && 
          agentResults.value && 
          agentResults.value.metadata?.tokenRecommendations && 
          agentResults.value.metadata.tokenRecommendations.length > 0) {
        console.log('[Demo] AI agent found recommendations:', agentResults.value.metadata.tokenRecommendations.length)
        // Ensure AI agent recommendations match TokenItem format
        const agentTokens = agentResults.value.metadata.tokenRecommendations.map(rec => ({
          id: rec.id,
          name: rec.name,
          symbol: rec.symbol,
          description: rec.description,
          price: rec.price || 0.001,
          image: rec.image,
          category: rec.category || 'cultural',
          culturalScore: rec.culturalScore,
          social: {
            website: process.env.NEXT_PUBLIC_TOKEN_CONTRACT_ADDRESS
          },
          metadata: {
            ...rec.metadata,
            isCulturalToken: true,
            timestamp: rec.metadata?.timestamp || Date.now(),
            aiScore: rec.metadata?.aiScore || rec.culturalScore || 0
          }
        }))
        combinedTokens.push(...agentTokens)
      }

      // Process MBD AI results
      if (mbdResults.status === 'fulfilled' && mbdResults.value?.casts) {
        console.log('[Demo] Processing MBD AI cultural tokens')
        const culturalTokens = mbdResults.value.casts.filter((cast: MbdCast) => {
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
                // Ensure MBD AI tokens match TokenItem format
                const token: TokenItem = {
                  id: cast.hash,
                  name: cast.text.split('\n')[0] || 'Untitled Token',
                  symbol: cast.text.match(/\$([A-Z]+)/)?.[1] || 'TOKEN',
                  description: cast.text,
                  price: 0.001,
                  image: cast.author.pfp || '',
                  category: cast.aiAnalysis?.category || 'cultural',
                  culturalScore: cast.metadata?.culturalScore || cast.aiAnalysis?.aiScore || 0,
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
                    tags: cast.labels || [],
                    sentiment: cast.aiAnalysis?.sentiment,
                    popularity: cast.aiAnalysis?.popularity,
                    aiScore: cast.aiAnalysis?.aiScore || 0,
                    isCulturalToken: true,
                    artStyle: cast.aiAnalysis?.artStyle,
                    culturalContext: cast.aiAnalysis?.culturalContext
                  }
                }

                // Enhance with AI agent analysis if available
                if (fid) {
                  try {
                    const analysis = await sendMessage({
                      message: `Analyze cultural significance: ${token.name} (${token.symbol}) - ${token.description}`,
                      userId: fid.toString(),
                      context: { currentToken: token }
                    })

                    if (analysis.metadata?.tokenRecommendations?.[0]) {
                      const enhancement = analysis.metadata.tokenRecommendations[0]
                      return {
                        ...token,
                        culturalScore: enhancement.culturalScore || token.culturalScore,
                        metadata: {
                          ...token.metadata,
                          ...enhancement.metadata,
                          aiScore: Math.max(
                            enhancement.metadata?.aiScore || 0,
                            token.metadata?.aiScore || 0
                          )
                        }
                      }
                    }
                  } catch (analysisError) {
                    console.error('[Demo] Token analysis error:', analysisError)
                  }
                }
                
                return token
              } catch (error) {
                console.error('[Demo] Error processing token:', error)
                return null
              }
            })
          )

          const validTokens = processedTokens.filter((token): token is TokenItem => token !== null)
          combinedTokens.push(...validTokens)
        }
      }

      // Set the combined results
      if (combinedTokens.length > 0) {
        console.log('[Demo] Setting combined tokens:', combinedTokens.length)
        
        // Remove duplicates based on token ID
        const uniqueTokens = Array.from(
          new Map(combinedTokens.map(token => [token.id, token])).values()
        )
        
        // Sort by cultural score and timestamp
        const sortedTokens = uniqueTokens.sort((a, b) => {
          const scoreA = a.culturalScore || a.metadata?.aiScore || 0
          const scoreB = b.culturalScore || b.metadata?.aiScore || 0
          if (scoreA !== scoreB) return scoreB - scoreA
          return (b.metadata?.timestamp || 0) - (a.metadata?.timestamp || 0)
        })

        console.log('[Demo] First token sample:', sortedTokens[0])
        setTokens(sortedTokens)
      } else {
        console.log('[Demo] No cultural tokens found from either source')
        setTokens([])
      }
    } catch (error) {
      console.error('[Demo] Error loading cultural tokens:', error)
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

  if (!isSDKLoaded) {
    return (
      <div className="w-[300px] mx-auto py-4 px-2">
        <h1 className="text-2xl font-bold text-center mb-4">Loading Frame...</h1>
      </div>
    )
  }

  return (
    <div className="w-[300px] mx-auto py-4 px-2">
      <h1 className="text-2xl font-bold text-center mb-4">Prism: Cultural Tokens</h1>
      <div className="mb-4">
        <pre className="text-xs overflow-auto">
          {JSON.stringify(context, null, 2)}
        </pre>
      </div>
    </div>
  )
} 