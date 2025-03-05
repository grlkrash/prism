'use client'

import React, { useState, useEffect } from 'react'
import { Token } from '../utils/mbdAi'
import { sendMessage } from '../utils/agentkit'
import { useAccount, useSendTransaction } from 'wagmi'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { TokenItem } from '@/types/token'
import { calculateTokenAmount } from '@/utils/token'
import sdk from '@farcaster/frame-sdk'

interface TokenGalleryProps {
  userId?: string
  tokens: TokenItem[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => Promise<void>
}

export function TokenGallery({ userId, tokens, isLoading, hasMore, onLoadMore }: TokenGalleryProps) {
  const { isConnected } = useAccount()
  const { sendTransaction, error: sendTxError, isPending: isSendTxPending } = useSendTransaction()
  const [ethAmount, setEthAmount] = React.useState('')

  const handleBuy = async (token: TokenItem) => {
    if (!token.social?.website) {
      console.error('No contract address found for token')
      return
    }

    try {
      const address = token.social.website.startsWith('0x') 
        ? token.social.website as `0x${string}`
        : `0x${token.social.website}` as `0x${string}`

      await sendTransaction({
        to: address,
        value: BigInt(parseFloat(ethAmount) * 1e18),
      })
    } catch (err) {
      console.error('Transaction failed:', err)
    }
  }

  const handleShare = async (token: TokenItem) => {
    try {
      await sdk.actions.openUrl(`https://warpcast.com/~/compose?text=Check out ${token.name} (${token.symbol}) - ${token.description}`)
    } catch (err) {
      console.error('Share failed:', err)
    }
  }

  return (
    <div className="space-y-4">
      {tokens.map((token) => (
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

      {isLoading && (
        <div className="flex justify-center p-4">
          <LoadingSpinner />
        </div>
      )}

      {hasMore && !isLoading && (
        <div className="flex justify-center p-4">
          <Button onClick={onLoadMore} variant="outline">
            Load More
          </Button>
        </div>
      )}
    </div>
  )
} 