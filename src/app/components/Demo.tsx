import { useEffect, useState } from 'react'
import sdk, { type FrameContext } from '@farcaster/frame-sdk'

export default function Demo() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)
  const [context, setContext] = useState<FrameContext>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    const load = async () => {
      try {
        // Get context before calling ready
        const ctx = await sdk.context
        setContext(ctx)
        await sdk.actions.ready()
      } catch (err) {
        console.error('Failed to initialize frame:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize frame')
      }
    }

    if (!isSDKLoaded) {
      setIsSDKLoaded(true)
      load()
    }
  }, [isSDKLoaded])

  if (error) {
    return (
      <div className="w-[300px] mx-auto py-4 px-2">
        <p className="text-red-500">Error: {error}</p>
      </div>
    )
  }

  if (!isSDKLoaded || !context) {
    return (
      <div className="w-[300px] mx-auto py-4 px-2">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="w-[300px] mx-auto py-4 px-2">
      <h1 className="text-2xl font-bold text-center mb-4">Prism: Digital Dreams #1</h1>
      <div className="text-sm mt-2">
        <p>Frame Context:</p>
        <pre className="bg-gray-100 p-2 mt-1 rounded text-xs">
          {JSON.stringify(context, null, 2)}
        </pre>
      </div>
    </div>
  )
} 