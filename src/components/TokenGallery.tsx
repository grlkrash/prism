'use client'

import React, { useState, useEffect } from 'react'
import { Token } from '../utils/mbdAi'

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
        // In a real app, this would be an API call
        const response = await fetch('/api/tokens')
        if (!response.ok) throw new Error('Failed to load tokens')
        const data = await response.json()
        setTokens(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tokens')
      } finally {
        setIsLoading(false)
      }
    }

    loadTokens()
  }, [])

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {tokens.map((token) => (
        <div key={token.id} className="border rounded-lg overflow-hidden shadow-lg">
          <img
            src={token.imageUrl}
            alt={token.name}
            className="w-full h-48 object-cover"
          />
          <div className="p-4">
            <h3 className="text-xl font-bold">{token.name}</h3>
            <p className="text-gray-600">{token.description}</p>
            <p className="text-sm text-gray-500">by {token.artistName}</p>
            <p className="text-lg font-semibold mt-2">{token.price}</p>
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