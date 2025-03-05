import { AgentProvider } from '@/contexts/agent-context'
import { AgentChat } from '@/components/agent/agent-chat'

export default function AgentPage() {
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