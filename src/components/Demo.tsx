'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSendTransaction,
  useConfig
} from 'wagmi'
import { Button } from '@/components/ui/button'
import sdk from '@farcaster/frame-sdk'
import type { Context } from '@farcaster/frame-core'
import type { TokenItem } from '@/types/token'
import { logger } from '@/utils/logger'
import { Feed } from '@/components/frame/feed'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FriendActivity } from '@/components/frame/friend-activity'
import { Referrals } from '@/components/frame/referrals'

export default function Demo() {
  const config = useConfig()
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<Context.FrameContext | undefined>()
  const [activeTab, setActiveTab] = useState('feed')

  // Wagmi hooks
  const { isConnected } = useAccount()
  const { connect: connectWallet } = useConnect()
  const { disconnect } = useDisconnect()
  const { sendTransaction } = useSendTransaction()

  // Initialize frame
  useEffect(() => {
    const initializeFrame = async () => {
      try {
        // First ensure SDK is ready
        await sdk.actions.ready()
        // Then get context
        const frameContext = await sdk.context
        setContext(frameContext)
        setIsSDKLoaded(true)
        logger.info('Frame initialized')
      } catch (error) {
        logger.error('Frame initialization error:', error)
        setError(error instanceof Error ? error.message : 'Failed to initialize frame')
      }
    }

    if (!isSDKLoaded) {
      initializeFrame()
    }
  }, [isSDKLoaded])

  // Add error boundary for RPC errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.name === 'RpcResponse.InternalErrorError') {
        logger.error('RPC Error:', event.error)
        setError('Connection error. Please try again.')
      }
    }

    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  // Share action
  const handleShare = useCallback((token: TokenItem) => {
    try {
      const shareUrl = `https://warpcast.com/~/compose?text=Check out ${token.name} (${token.symbol})`
      sdk.actions.openUrl(shareUrl)
    } catch (error) {
      logger.error('Error sharing:', error)
      setError('Failed to share token')
    }
  }, [])

  // Buy action
  const handleBuy = useCallback((token: TokenItem) => {
    try {
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

      sendTransaction({
        to: contractAddress as `0x${string}`,
        value: BigInt(0.001 * 1e18), // Default 0.001 ETH for demo
      })
    } catch (error) {
      logger.error('Error buying:', error)
      setError('Failed to initiate purchase')
    }
  }, [isConnected, connectWallet, config.connectors, sendTransaction])

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
      
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-2">Cultural Token Discovery</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Explore and collect cultural tokens from the community
          </p>
          
          <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="feed">Feed</TabsTrigger>
              <TabsTrigger value="friends">Friends</TabsTrigger>
              <TabsTrigger value="referrals">Referrals</TabsTrigger>
            </TabsList>

            <TabsContent value="feed" className="mt-4">
              {error ? (
                <div className="text-red-500 text-sm">{error}</div>
              ) : (
                <Feed 
                  fid={context?.user?.fid}
                  onShare={handleShare}
                  onBuy={handleBuy}
                />
              )}
            </TabsContent>

            <TabsContent value="friends" className="mt-4">
              {error ? (
                <div className="text-red-500 text-sm">{error}</div>
              ) : (
                <FriendActivity fid={context?.user?.fid} />
              )}
            </TabsContent>

            <TabsContent value="referrals" className="mt-4">
              {error ? (
                <div className="text-red-500 text-sm">{error}</div>
              ) : (
                <Referrals fid={context?.user?.fid} />
              )}
            </TabsContent>
          </Tabs>

          {isConnected ? (
            <Button onClick={() => disconnect()} className="w-full mt-4">
              Disconnect Wallet
            </Button>
          ) : (
            <Button 
              onClick={() => connectWallet({ connector: config.connectors[0] })}
              className="w-full mt-4"
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </div>
  )
} 