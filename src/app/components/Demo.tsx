import { useEffect, useState } from 'react'
import sdk from '@farcaster/frame-sdk'

export default function Demo() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [context, setContext] = useState<any>(null)

  useEffect(() => {
    async function load() {
      try {
        const ctx = await sdk.context
        await sdk.actions.ready()
        setContext(ctx)
        setIsSDKLoaded(true)
      } catch (err) {
        console.error('Failed to initialize SDK:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize SDK')
      }
    }
    load()
  }, [])

  if (error) return <div>Error: {error}</div>
  if (!isSDKLoaded) return <div>Loading SDK...</div>

  return (
    <div className="w-[300px] mx-auto py-4 px-2">
      <h1 className="text-2xl font-bold text-center mb-4">Frames v2 Demo</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(context, null, 2)}
      </pre>
    </div>
  )
} 