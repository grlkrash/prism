import { AgentRequest, AgentResponse, agentRequestSchema, agentResponseSchema, getAgent } from '@/config/agentkit'
import { logger } from './logger'
import { analyzeToken } from './mbdAi'
import { HumanMessage } from "@langchain/core/messages"

export class AgentkitError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number = 500, code?: string) {
    super(message)
    this.name = 'AgentkitError'
    this.status = status
    this.code = code
  }
}

export async function sendMessage(request: AgentRequest): Promise<AgentResponse> {
  try {
    const validatedRequest = agentRequestSchema.parse(request)
    const agent = await getAgent()

    const response = await agent.invoke({
      messages: [{ content: validatedRequest.message }],
      configurable: {
        thread_id: validatedRequest.threadId || `cultural-agent-${crypto.randomUUID()}`
      }
    })

    const result: AgentResponse = {
      id: crypto.randomUUID(),
      content: response,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      metadata: {
        tokenRecommendations: await extractTokenRecommendations(response),
        actions: extractActions(response)
      }
    }

    return agentResponseSchema.parse(result)
  } catch (error) {
    logger.error('Error in sendMessage:', error)
    throw new AgentkitError(error.message || 'Internal server error')
  }
}

function extractActions(content: string): Array<{ type: string; tokenId: string; label: string }> {
  const actions: Array<{ type: string; tokenId: string; label: string }> = []
  const lines = content.split('\n')
  let inActionsSection = false

  for (const line of lines) {
    if (line.trim() === 'Actions:') {
      inActionsSection = true
      continue
    }

    if (inActionsSection && line.includes('|')) {
      const [type, tokenId, label] = line.split('|')
      if (type && tokenId && label) {
        actions.push({ type: type.trim(), tokenId: tokenId.trim(), label: label.trim() })
      }
    }
  }

  return actions
}

async function extractTokenRecommendations(content: string): Promise<any[]> {
  const recommendations: any[] = []
  const lines = content.split('\n')
  let inRecommendationsSection = false

  for (const line of lines) {
    if (line.includes('Token Recommendations:')) {
      inRecommendationsSection = true
      continue
    }

    if (inRecommendationsSection && line.match(/^\d+\./)) {
      const match = line.match(/(\d+)\.\s+([^(]+)\s+\((\$[^)]+)\):\s+(.+)/)
      if (match) {
        const [_, number, name, symbol, description] = match
        const token = {
          id: crypto.randomUUID(),
          name: name.trim(),
          symbol: symbol.replace('$', '').trim(),
          description: description.trim(),
          imageUrl: '',
          price: '0',
          culturalScore: Math.floor(Math.random() * 100),
          tokenType: 'ERC20'
        }
        
        try {
          const analyzedToken = await analyzeToken(token)
          recommendations.push(analyzedToken)
        } catch (error) {
          logger.error('Error analyzing token:', { error, tokenId: token.id })
          recommendations.push(token)
        }
      }
    }
  }

  return recommendations
}

export async function getTokenRecommendations(userId: string, preferences?: {
  interests?: string[]
  priceRange?: { min?: number; max?: number }
}): Promise<AgentResponse> {
  // Ensure priceRange has both min and max values
  const normalizedPreferences = preferences ? {
    ...preferences,
    priceRange: preferences.priceRange ? {
      min: preferences.priceRange.min || 0,
      max: preferences.priceRange.max || 1000
    } : undefined
  } : undefined

  return sendMessage({
    message: 'Please recommend some cultural tokens based on my preferences and Farcaster trends.',
    userId,
    context: {
      userPreferences: normalizedPreferences
    }
  })
}

export async function analyzeTokenWithAgent(tokenId: string, userId: string): Promise<AgentResponse> {
  return sendMessage({
    message: `Please analyze this token and provide insights, including Farcaster sentiment: ${tokenId}`,
    userId,
    context: {
      currentToken: {
        id: tokenId,
        name: 'Token Name', // This should be fetched from your database
        description: 'Token Description',
        imageUrl: 'https://example.com/token.jpg',
        price: '0.1 ETH'
      }
    }
  })
} 