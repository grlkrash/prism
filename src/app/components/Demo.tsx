import { useEffect, useState, useCallback } from 'react'
import sdk from '@farcaster/frame-sdk'
import { Button } from '@/components/ui/button'

interface FrameContext {
  fid?: number
  username?: string
  displayName?: string
  pfp?: string
  bio?: string
  location?: {
    placeId: string
    description: string
  }
}

interface Token {
  id: string
  name: string
  image: string
  description: string
  score: number
}

export default function Demo() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [context, setContext] = useState<FrameContext | null>(null)
  const [isContextOpen, setIsContextOpen] = useState(false)
  const [tokens, setTokens] = useState<Token[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const ctx = await sdk.context
        setContext(ctx?.user || null)
        await sdk.actions.ready()
        setIsSDKLoaded(true)
        
        // Load initial tokens
        const initialTokens = await fetchTokens()
        setTokens(initialTokens)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to load SDK:', error)
        setIsLoading(false)
      }
    }
    
    if (sdk && !isSDKLoaded) {
      load()
    }
  }, [isSDKLoaded])

  const toggleContext = useCallback(() => {
    setIsContextOpen((prev) => !prev)
  }, [])

  const handleCollect = async (tokenId: string) => {
    try {
      // Implement collect action using Frame SDK
      await sdk.actions.openUrl({
        url: `https://warpcast.com/~/token/${tokenId}`,
      })
    } catch (error) {
      console.error('Failed to collect token:', error)
    }
  }

  const handleShare = async (tokenId: string) => {
    try {
      // Implement share action using Frame SDK
      await sdk.actions.openUrl({
        url: `https://warpcast.com/~/compose?text=Check out this token: ${tokenId}`,
      })
    } catch (error) {
      console.error('Failed to share token:', error)
    }
  }

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => prev + 1)
  }, [])

  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }, [])

  if (!isSDKLoaded || isLoading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>
  }

  return (
    <div className="w-[300px] mx-auto py-4 px-2">
      <h1 className="text-2xl font-bold text-center mb-4">Prism Frame</h1>
      
      {/* Context Display */}
      <div className="mb-4">
        <h2 className="font-2xl font-bold">Context</h2>
        <button
          onClick={toggleContext}
          className="flex items-center gap-2 transition-colors"
        >
          <span className={`transform transition-transform ${isContextOpen ? 'rotate-90' : ''}`}>
            ➤
          </span>
          Tap to expand
        </button>

        {isContextOpen && context && (
          <div className="p-4 mt-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <pre className="font-mono text-xs whitespace-pre-wrap break-words max-w-[260px]">
              {JSON.stringify(context, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Token Feed */}
      <div className="space-y-4">
        {tokens.slice(currentPage * 3, (currentPage + 1) * 3).map((token) => (
          <div key={token.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
            <img 
              src={token.image} 
              alt={token.name}
              className="w-full h-48 object-cover rounded-lg mb-2"
            />
            <h3 className="font-bold">{token.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              {token.description}
            </p>
            <div className="flex justify-between gap-2">
              <Button 
                onClick={() => handleCollect(token.id)}
                className="flex-1"
              >
                Collect
              </Button>
              <Button 
                onClick={() => handleShare(token.id)}
                className="flex-1"
              >
                Share
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-between mt-4">
        <Button 
          onClick={handlePrevPage}
          disabled={currentPage === 0}
        >
          Previous
        </Button>
        <Button 
          onClick={handleNextPage}
          disabled={tokens.length <= (currentPage + 1) * 3}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

// Helper function to fetch tokens (implement with your API)
async function fetchTokens(): Promise<Token[]> {
  // TODO: Replace with actual API call
  return [
    {
      id: '1',
      name: 'Example Token 1',
      image: 'https://placeholder.co/300x200',
      description: 'An example cultural token',
      score: 85
    },
    // Add more example tokens...
  ]
} 