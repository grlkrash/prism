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
        logger.info('Initializing Frame SDK...')
        
        // First ensure SDK is ready and get context
        await sdk.actions.ready()
        const frameContext = await sdk.context
        logger.info('Frame context received:', frameContext)
        
        // Initialize ethProvider
        if (sdk.wallet.ethProvider) {
          logger.info('Frame wallet provider available')
        }
        
        setContext(frameContext)
        setIsSDKLoaded(true)
        logger.info('Frame initialization complete')
      } catch (error) {
        logger.error('Error initializing frame:', error)
        setError(error instanceof Error ? error.message : 'Failed to initialize frame')
      }
    }

    if (!isSDKLoaded) {
      initializeFrame()
    }
  }, [isSDKLoaded])

  const handleConnect = useCallback(async () => {
    try {
      if (!isSDKLoaded) {
        throw new Error('Frame SDK not initialized')
      }

      logger.info('Starting wallet connection...')

      // Get the frame connector
      const connector = config.connectors[0]
      if (!connector) {
        throw new Error('No wallet connector available')
      }
      logger.info('Found wallet connector:', connector.name)

      // First ensure we have frame context
      if (!context?.user?.fid) {
        throw new Error('Frame context not available')
      }
      logger.info('Frame context verified, FID:', context.user.fid)

      // Get accounts using ethProvider
      const provider = sdk.wallet.ethProvider
      if (!provider) {
        throw new Error('Wallet provider not available')
      }

      // Request accounts
      const accounts = await provider.request({ method: 'eth_requestAccounts' })
      logger.info('Accounts received:', accounts)

      // Connect using wagmi
      await connectWallet({
        connector,
        chainId: 8453 // Base mainnet
      })
      
      logger.info('Wallet connected successfully')
    } catch (error) {
      logger.error('Error connecting wallet:', error)
      setError(error instanceof Error ? error.message : 'Failed to connect wallet. Please try again.')
    }
  }, [isSDKLoaded, connectWallet, config.connectors, context])

  // Add error boundary for RPC errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Handle both RPC and general connection errors
      if (event.error?.name === 'RpcResponse.InternalErrorError' || 
          event.error?.message?.includes('connection') ||
          event.error?.message?.includes('network')) {
        logger.error('Connection Error:', event.error)
        setError('Connection error. Please check your wallet and network connection.')
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', (event) => handleError(event as unknown as ErrorEvent))
    
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', (event) => handleError(event as unknown as ErrorEvent))
    }
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
        handleConnect()
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
  }, [isConnected, handleConnect, sendTransaction])

  if (!isSDKLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-[300px] mx-auto py-4 px-2">
        <h1 className="text-2xl font-bold text-center mb-4">Cultural Token Discovery</h1>
        <p className="text-center text-muted-foreground mb-6">
          Explore and collect cultural tokens from the community
        </p>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-4 rounded-lg mb-4">
            {error}
            <Button 
              onClick={() => setError(null)} 
              variant="ghost" 
              size="sm" 
              className="ml-2"
            >
              Dismiss
            </Button>
          </div>
        )}

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-4">
            <Feed fid={context?.user?.fid} onShare={handleShare} onBuy={handleBuy} />
            {!isConnected && (
              <div className="mt-4">
                <Button 
                  onClick={handleConnect} 
                  className="w-full"
                  size="lg"
                >
                  Connect Wallet to Interact
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="friends">
            {isConnected ? (
              <FriendActivity fid={context?.user?.fid} />
            ) : (
              <Button onClick={handleConnect} className="w-full">Connect Wallet</Button>
            )}
          </TabsContent>

          <TabsContent value="referrals">
            {isConnected ? (
              <Referrals fid={context?.user?.fid} />
            ) : (
              <Button onClick={handleConnect} className="w-full">Connect Wallet</Button>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
} 