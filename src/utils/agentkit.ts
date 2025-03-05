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
import { agentInstance } from '@/config/agentkit'
import { getAgent } from '@/config/agentkit'
import { RateLimitError } from '@/utils/errors'

class AgentkitError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message)
    this.name = 'AgentkitError'
  }
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10

const userRequestCounts = new Map<string, { count: number; timestamp: number }>()

function checkRateLimit(userId: string) {
  const now = Date.now()
  const userRequests = userRequestCounts.get(userId)

  if (!userRequests) {
    userRequestCounts.set(userId, { count: 1, timestamp: now })
    return
  }

  if (now - userRequests.timestamp > RATE_LIMIT_WINDOW) {
    userRequestCounts.set(userId, { count: 1, timestamp: now })
    return
  }

  if (userRequests.count >= MAX_REQUESTS_PER_WINDOW) {
    throw new RateLimitError('Rate limit exceeded')
  }

  userRequests.count++
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

export async function sendMessage(request: unknown) {
  try {
    const validatedRequest = agentRequestSchema.parse(request)
    const { message, userId = 'anonymous', context } = validatedRequest

    // Check rate limit
    checkRateLimit(userId)

    // Get agent instance
    const agent = await getAgent()
    if (!agent) throw new Error('Failed to initialize agent')

    // Prepare context
    const contextStr = context ? JSON.stringify(context) : ''
    const input = contextStr ? `${message}\nContext: ${contextStr}` : message

    // Call agent
    const result = await agent.invoke({
      input,
    })

    // Parse response
    const response = agentResponseSchema.parse({
      id: crypto.randomUUID(),
      content: result.output,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      metadata: {
        tokenRecommendations: extractTokenRecommendations(result.output),
        actions: extractActions(result.output)
      }
    })

    return response
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error
    }
    console.error('Agent error:', error)
    throw new Error('Failed to process request')
  }
}

function extractTokenRecommendations(output: string) {
  try {
    const regex = /Token Recommendations:([\s\S]*?)(?=\n\n|$)/
    const match = output.match(regex)
    if (!match) return []

    const recommendations = match[1].trim().split('\n').map(line => {
      const [name, description] = line.split(':').map(s => s.trim())
      return {
        id: crypto.randomUUID(),
        name,
        description,
        imageUrl: '', // Would be populated from token metadata
        price: '0', // Would be populated from price feed
      }
    })

    return recommendations
  } catch (error) {
    console.error('Error extracting recommendations:', error)
    return []
  }
}

function extractActions(output: string) {
  try {
    const regex = /Actions:([\s\S]*?)(?=\n\n|$)/
    const match = output.match(regex)
    if (!match) return []

    const actions = match[1].trim().split('\n').map(line => {
      const [type, tokenId, label] = line.split('|').map(s => s.trim())
      return {
        type: type as 'view' | 'buy' | 'share' | 'analyze' | 'farcaster',
        tokenId,
        label
      }
    })

    return actions
  } catch (error) {
    console.error('Error extracting actions:', error)
    return []
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