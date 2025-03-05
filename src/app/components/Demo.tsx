import { useEffect, useState, useCallback } from 'react'
import sdk from '@farcaster/frame-sdk'
import { Button } from './ui/Button'

export default function Demo() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<any>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Mock data for demo
  const items = [
    { id: 1, title: 'Digital Dreams #1', description: 'A mesmerizing digital artwork' },
    { id: 2, title: 'Digital Dreams #2', description: 'An ethereal digital creation' },
    { id: 3, title: 'Digital Dreams #3', description: 'A stunning digital masterpiece' },
  ]

  useEffect(() => {
    async function load() {
      try {
        if (!sdk) {
          throw new Error('SDK not loaded')
        }

        // Wait for SDK to be ready
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Get context first
        const ctx = await sdk.context
        setContext(ctx)
        
        // Then signal ready
        if (sdk.actions) {
          await sdk.actions.ready()
          setIsSDKLoaded(true)
        } else {
          throw new Error('SDK actions not available')
        }
      } catch (err) {
        console.error('Failed to initialize SDK:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize SDK')
      }
    }
    load()
  }, [])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length)
  }, [items.length])

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)
  }, [items.length])

  const handleCollect = useCallback(() => {
    if (sdk.actions) {
      sdk.actions.openUrl(`https://base.org/collect/${items[currentIndex].id}`)
    }
  }, [currentIndex, items])

  const handleShare = useCallback(() => {
    if (sdk.actions) {
      sdk.actions.openUrl(`https://warpcast.com/~/compose?text=Check out ${items[currentIndex].title}!`)
    }
  }, [currentIndex, items])

  if (error) return (
    <div className="w-[300px] mx-auto py-4 px-2">
      <div className="text-red-500">Error: {error}</div>
    </div>
  )
  
  if (!isSDKLoaded) return (
    <div className="w-[300px] mx-auto py-4 px-2">
      <div>Loading SDK...</div>
    </div>
  )

  const currentItem = items[currentIndex]

  return (
    <div className="w-[300px] mx-auto py-4 px-2">
      <h1 className="text-2xl font-bold text-center mb-4">{currentItem.title}</h1>
      
      {/* Image Placeholder */}
      <div className="aspect-video bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
        <span className="text-gray-500">Image {currentIndex + 1}</span>
      </div>

      {/* Description */}
      <p className="text-gray-600 mb-6">{currentItem.description}</p>

      {/* Navigation */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Button onClick={handlePrevious} variant="secondary">Previous</Button>
        <Button onClick={handleNext}>Next</Button>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <Button onClick={handleCollect} variant="primary">Collect</Button>
        <Button onClick={handleShare} variant="secondary">Share</Button>
      </div>

      {/* Debug: Context */}
      <div className="mt-8 border-t pt-4">
        <h2 className="text-sm font-bold mb-2">Debug: Frame Context</h2>
        <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
          {JSON.stringify(context, null, 2)}
        </pre>
      </div>
    </div>
  )
} 