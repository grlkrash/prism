import { z } from 'zod'
import {
  AgentKit,
  CdpWalletProvider,
  wethActionProvider,
  walletActionProvider,
  erc20ActionProvider,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  pythActionProvider,
} from "@coinbase/agentkit"
import { AGENTKIT_CONFIG, AgentRequest, AgentResponse, agentRequestSchema, agentResponseSchema, actionProviders } from '@/config/agentkit'
import { logger } from './logger'
import { analyzeToken } from './mbdAi'
import { getLangChainTools } from "@coinbase/agentkit-langchain"
import { HumanMessage } from "@langchain/core/messages"
import { MemorySaver } from "@langchain/langgraph"
import { createReactAgent } from "@langchain/langgraph/prebuilt"
import { ChatOpenAI } from "@langchain/openai"
import { AgentExecutor } from "@langchain/core/agents"
import { agent } from '@/config/agentkit'

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
const tools = getLangChainTools(actionProviders as any)

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

export async function sendMessage(request: z.infer<typeof agentRequestSchema>): Promise<z.infer<typeof agentResponseSchema>> {
  try {
    // Validate request
    const validatedRequest = agentRequestSchema.parse(request)

    // Check rate limit if userId is provided
    if (validatedRequest.userId && !checkRateLimit(validatedRequest.userId)) {
      logger.warn('Rate limit exceeded', { userId: validatedRequest.userId })
      throw new RateLimitError(AGENTKIT_CONFIG.ERROR_MESSAGES.RATE_LIMIT)
    }

    logger.debug('Sending message to Agentkit', { request: validatedRequest })

    // Create message for LangChain
    const message = new HumanMessage(validatedRequest.message)

    // Run the agent
    const result = await agent.invoke({
      messages: [message],
      context: validatedRequest.context
    })

    // Format response
    const validatedResponse = agentResponseSchema.parse({
      id: Date.now().toString(),
      content: result.content,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      metadata: result.metadata
    })

    // If there are token recommendations, analyze them with MBD AI
    if (validatedResponse.metadata?.tokenRecommendations) {
      validatedResponse.metadata.tokenRecommendations = await Promise.all(
        validatedResponse.metadata.tokenRecommendations.map(async (token) => {
          const analyzedToken = await analyzeToken(token)
          return {
            ...token,
            culturalScore: analyzedToken.metadata?.aiScore
          }
        })
      )
    }

    logger.debug('Agentkit response received', { response: validatedResponse })
    return validatedResponse
  } catch (error) {
    if (error instanceof AgentkitError) {
      throw error
    }
    logger.error('Failed to communicate with Agentkit API', { error })
    throw new AgentkitError(AGENTKIT_CONFIG.ERROR_MESSAGES.API_ERROR)
  }
}

export async function getTokenRecommendations(userId: string, preferences?: {
  interests?: string[]
  priceRange?: { min?: number; max?: number }
}): Promise<z.infer<typeof agentResponseSchema>> {
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
      userPreferences: normalizedPreferences
    }
  })
}

export async function analyzeTokenWithAgent(tokenId: string, userId: string): Promise<z.infer<typeof agentResponseSchema>> {
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