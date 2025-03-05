import { AGENTKIT_CONFIG, AgentRequest, AgentResponse, agentRequestSchema, agentResponseSchema, actionProviders } from '@/config/agentkit'
import { logger } from './logger'
import { analyzeToken } from './mbdAi'
import { getLangChainTools } from "@coinbase/agentkit-langchain"
import { HumanMessage } from "@langchain/core/messages"
import { MemorySaver } from "@langchain/langgraph"
import { createReactAgent } from "@langchain/langgraph/prebuilt"
import { ChatOpenAI } from "@langchain/openai"
import { AgentKit } from "@coinbase/agentkit-langchain"
import { z } from 'zod'

class AgentkitError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message)
    this.name = 'AgentkitError'
  }
}

class RateLimitError extends AgentkitError {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
    this.code = 'RATE_LIMIT_EXCEEDED'
  }
}

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  requests: new Map<string, number[]>()
}

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userRequests = RATE_LIMIT.requests.get(userId) || []
  
  // Remove old requests
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT.windowMs)
  
  if (recentRequests.length >= RATE_LIMIT.maxRequests) {
    return false
  }
  
  recentRequests.push(now)
  RATE_LIMIT.requests.set(userId, recentRequests)
  return true
}

// Initialize LangChain tools
const tools = getLangChainTools(actionProviders as unknown as AgentKit)

// Initialize the agent
const llm = new ChatOpenAI({
  model: AGENTKIT_CONFIG.MODEL,
  temperature: AGENTKIT_CONFIG.TEMPERATURE,
  maxTokens: AGENTKIT_CONFIG.MAX_TOKENS,
})

const agent = createReactAgent({
  llm,
  tools,
  systemPrompt: AGENTKIT_CONFIG.SYSTEM_PROMPT,
})

export async function sendMessage(request: unknown): Promise<AgentResponse> {
  try {
    // Validate request
    const { message, userId, context, threadId } = z.object({
      message: z.string(),
      userId: z.string().optional(),
      context: z.record(z.any()).optional(),
      threadId: z.string().optional()
    }).parse(request)

    // Check rate limit
    if (userId && !checkRateLimit(userId)) {
      throw new RateLimitError('Rate limit exceeded')
    }

    // Call OpenAI API directly
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, userId, context, threadId })
    })

    if (!response.ok) {
      throw new Error('Failed to get response from agent')
    }

    const result = await response.json()
    return agentResponseSchema.parse(result)

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AgentkitError('Invalid request format', 400)
    }
    if (error instanceof RateLimitError) {
      throw new AgentkitError('Rate limit exceeded', 429)
    }
    throw new AgentkitError(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
}

export async function getTokenRecommendations(userId: string, preferences?: {
  interests?: string[]
  priceRange?: { min?: number; max?: number }
}, farcasterClient?: any): Promise<AgentResponse> {
  // Ensure priceRange has both min and max values
  const normalizedPreferences = preferences ? {
    ...preferences,
    priceRange: preferences.priceRange ? {
      min: preferences.priceRange.min || 0,
      max: preferences.priceRange.max || 1000
    } : undefined
  } : undefined;

  return sendMessage({
    message: 'Please recommend some cultural tokens based on my preferences and Farcaster trends.',
    userId,
    context: {
      userPreferences: normalizedPreferences,
      farcasterContext: farcasterClient ? {
        client: farcasterClient,
        userFid: userId
      } : undefined
    }
  })
}

export async function analyzeTokenWithAgent(tokenId: string, userId: string, farcasterClient?: any): Promise<AgentResponse> {
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
      },
      farcasterContext: farcasterClient ? {
        client: farcasterClient,
        userFid: userId
      } : undefined
    }
  })
} 