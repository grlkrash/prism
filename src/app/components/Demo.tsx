import { useEffect, useState } from 'react'
import sdk from '@farcaster/frame-sdk'

export default function Demo() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<any>(null)

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

  return (
    <div className="w-[300px] mx-auto py-4 px-2">
      <h1 className="text-2xl font-bold text-center mb-4">Frames v2 Demo</h1>
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Frame Context:</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(context, null, 2)}
        </pre>
      </div>
    </div>
  )
} 