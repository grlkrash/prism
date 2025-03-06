'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSendTransaction,
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
import { config } from '@/components/providers/WagmiProvider'
import { getAddress } from 'viem'

export default function Demo() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<Context.FrameContext | undefined>()
  const [activeTab, setActiveTab] = useState('feed')

  // Wagmi hooks
  const { isConnected } = useAccount()
  const { connect: connectWallet } = useConnect()
  const { disconnect } = useDisconnect()
  const { sendTransaction } = useSendTransaction()

  // Initialize Frame SDK
  useEffect(() => {
    let cleanup: (() => void) | undefined

    async function initializeFrame() {
      try {
        // Get frame context
        const frameContext = await sdk.context
        logger.info('Frame context retrieved:', frameContext)
        
        // Signal ready to Warpcast
        await sdk.actions.ready()
        
        setContext(frameContext)
        setIsSDKLoaded(true)

        // Add provider event listeners
        if (sdk.wallet.ethProvider) {
          // Handle disconnects and errors
          const handleDisconnect = (error?: Error) => {
            logger.info('Provider disconnected', error)
            if (error) {
              logger.error('Provider error:', error)
              setError(`Provider Error: ${error.message}`)
            } else {
              setError('Wallet disconnected')
            }
          }

          // Handle chain changes
          const handleChainChanged = (chainId: string) => {
            try {
              logger.info('Chain changed:', chainId)
              const numericChainId = parseInt(chainId, 16)
              if (numericChainId !== 8453) { // Base mainnet
                setError('Please switch to Base network')
              }
              // Refresh page on chain change to ensure proper state
              window.location.reload()
            } catch (err) {
              logger.error('Error handling chain change:', err)
              setError('Invalid chain ID received')
            }
          }

          // Handle account changes with proper error catching
          const handleAccountsChanged = (accounts: readonly `0x${string}`[]) => {
            try {
              if (!accounts || accounts.length === 0) {
                handleDisconnect()
                return
              }
              const formattedAccounts = accounts.map(getAddress)
              logger.info('Accounts changed:', formattedAccounts)
            } catch (err) {
              logger.error('Error handling account change:', err)
              setError('Failed to update accounts')
            }
          }

          // Set up event listeners
          sdk.wallet.ethProvider.on('disconnect', handleDisconnect)
          sdk.wallet.ethProvider.on('chainChanged', handleChainChanged)
          sdk.wallet.ethProvider.on('accountsChanged', handleAccountsChanged)

          // Return cleanup function
          cleanup = () => {
            if (sdk.wallet.ethProvider) {
              sdk.wallet.ethProvider.removeListener('disconnect', handleDisconnect)
              sdk.wallet.ethProvider.removeListener('chainChanged', handleChainChanged)
              sdk.wallet.ethProvider.removeListener('accountsChanged', handleAccountsChanged)
            }
          }
        }
      } catch (e) {
        logger.error('Frame SDK initialization error:', e)
        setError(e instanceof Error ? e.message : 'Failed to initialize Frame SDK')
        setIsSDKLoaded(false)
      }
    }

    if (!isSDKLoaded) {
      initializeFrame()
    }

    return () => {
      cleanup?.()
    }
  }, [isSDKLoaded])

  // Handle wallet connection with better error handling
  const handleConnect = useCallback(async () => {
    try {
      await connectWallet({
        connector: config.connectors[0],
        chainId: 8453 // Base mainnet
      })
    } catch (e) {
      logger.error('Wallet connection error:', e)
      if (e instanceof Error) {
        if (e.message.includes('user rejected')) {
          setError('Connection rejected by user')
        } else if (e.message.includes('chain')) {
          setError('Please switch to Base network')
        } else if (e.message.includes('provider')) {
          setError('Provider error: Please try again')
        } else {
          setError(`Connection failed: ${e.message}`)
        }
      } else {
        setError('Failed to connect wallet')
      }
    }
  }, [connectWallet])

  // Handle wallet disconnection
  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect()
      setContext(undefined)
      setIsSDKLoaded(false)
    } catch (e) {
      logger.error('Wallet disconnection error:', e)
      setError(e instanceof Error ? e.message : 'Failed to disconnect wallet')
    }
  }, [disconnect])

  if (!isSDKLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading Frame...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Cultural Token Discovery</h1>
          <div>
            {isConnected ? (
              <Button onClick={handleDisconnect}>Disconnect</Button>
            ) : (
              <Button onClick={handleConnect}>Connect Wallet</Button>
            )}
          </div>
        </div>

        {error && (
          <Dialog open={!!error} onOpenChange={() => setError(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Error</DialogTitle>
                <DialogDescription>{error}</DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="friends">Friend Activity</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
          </TabsList>
          <TabsContent value="feed">
            <Feed fid={context?.user?.fid} />
          </TabsContent>
          <TabsContent value="friends">
            <FriendActivity fid={context?.user?.fid} />
          </TabsContent>
          <TabsContent value="referrals">
            <Referrals fid={context?.user?.fid} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 