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
          // Handle disconnects (includes errors)
          const handleDisconnect = (error: Error) => {
            logger.error('Provider disconnected:', error)
            setError(`Provider Error: ${error.message}`)
          }

          // Handle chain changes
          const handleChainChanged = (chainId: string) => {
            logger.info('Chain changed:', chainId)
          }

          // Handle account changes
          const handleAccountsChanged = (accounts: readonly `0x${string}`[]) => {
            const formattedAccounts = accounts.map(getAddress)
            logger.info('Accounts changed:', formattedAccounts)
            if (accounts.length === 0) {
              setError('Wallet disconnected')
            }
          }

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

  // Handle wallet connection
  const handleConnect = useCallback(async () => {
    try {
      await connectWallet({
        connector: config.connectors[0],
        chainId: 8453 // Base mainnet
      })
    } catch (e) {
      logger.error('Wallet connection error:', e)
      setError(e instanceof Error ? e.message : 'Failed to connect wallet')
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