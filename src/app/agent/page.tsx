'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FEATURE_FLAGS } from '@/utils/feature-flags'
import { AgentProvider } from '@/contexts/agent-context'
import { AgentChat } from '@/components/experimental/agent-chat'

export default function AgentPage() {
  const router = useRouter()

  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_AGENT_CHAT) {
      router.push('/')
    }
  }, [router])

  if (!FEATURE_FLAGS.ENABLE_AGENT_CHAT) {
    return null
  }

  return (
    <main className="container mx-auto py-8">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Cultural Token Assistant</h1>
          <p className="text-muted-foreground mt-2">
            Ask me about cultural tokens, get recommendations, and learn more about the ecosystem
          </p>
        </div>
        <AgentProvider>
          <AgentChat />
        </AgentProvider>
      </div>
    </main>
  )
} 