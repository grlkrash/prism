'use client'

import { useState } from 'react'
import { useAgent } from '@/contexts/agent-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AgentChat() {
  const { messages, isLoading, error, sendMessage } = useAgent()
  const [input, setInput] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    await sendMessage(input)
    setInput('')
  }

  return (
    <Card className="flex flex-col h-[600px] w-full max-w-2xl mx-auto">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'assistant' ? 'justify-start' : 'justify-end'
              )}
            >
              {message.role === 'assistant' && (
                <Avatar>
                  <AvatarImage src="/agent-avatar.png" alt="Agent" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'rounded-lg px-4 py-2 max-w-[80%]',
                  message.role === 'assistant'
                    ? 'bg-muted'
                    : 'bg-primary text-primary-foreground'
                )}
              >
                <p className="text-sm">{message.content}</p>
                {message.metadata?.tokenRecommendations && (
                  <div className="mt-4 space-y-2">
                    {message.metadata.tokenRecommendations.map((token) => (
                      <Card key={token.id} className="p-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={token.imageUrl}
                            alt={token.name}
                            className="w-12 h-12 rounded"
                          />
                          <div>
                            <h4 className="font-medium">{token.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {token.price}
                            </p>
                            {token.culturalScore && (
                              <p className="text-xs text-muted-foreground">
                                Cultural Score: {token.culturalScore}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </ScrollArea>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about cultural tokens..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            Send
          </Button>
        </div>
      </form>
    </Card>
  )
} 