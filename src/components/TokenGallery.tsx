'use client'

import React, { useState, useEffect } from 'react'
import { Token } from '../utils/mbdAi'
import { sendMessage } from '../utils/agentkit'

interface TokenGalleryProps {
  userId?: string
}

export function TokenGallery({ userId }: TokenGalleryProps) {
  const [tokens, setTokens] = useState<Token[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTokens() {
      try {
        setIsLoading(true)
        
        // Get recommendations from agent
        const response = await sendMessage({
          message: 'Please recommend some trending cultural tokens based on Farcaster activity',
          userId: userId || 'anonymous',
          context: {
            userPreferences: {
              interests: ['art', 'music', 'culture']
            }
          }
        })

        if (response.metadata?.tokenRecommendations) {
          setTokens(response.metadata.tokenRecommendations)
        } else {
          throw new Error('No recommendations found')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tokens')
      } finally {
        setIsLoading(false)
      }
    }

    loadTokens()
  }, [userId])

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {tokens.map((token) => (
        <div key={token.id} className="border rounded-lg overflow-hidden shadow-lg">
          <img
            src={token.imageUrl || 'https://placehold.co/400x300/png'}
            alt={token.name}
            className="w-full h-48 object-cover"
          />
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-bold">{token.name}</h3>
              <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                ${token.symbol}
              </span>
            </div>
            <p className="text-gray-600 mb-2">{token.description}</p>
            <div className="flex justify-between items-center">
              <p className="text-lg font-semibold">{token.price}</p>
              <div className="text-sm text-gray-500">
                Cultural Score: {token.culturalScore}
              </div>
            </div>
            {token.social && (
              <div className="mt-4 flex space-x-4">
                {token.social.twitter && (
                  <a
                    href={`https://${token.social.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-600"
                  >
                    Twitter
                  </a>
                )}
                {token.social.discord && (
                  <a
                    href={`https://${token.social.discord}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-600"
                  >
                    Discord
                  </a>
                )}
                {token.social.website && (
                  <a
                    href={`https://${token.social.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-600"
                  >
                    Website
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
} 