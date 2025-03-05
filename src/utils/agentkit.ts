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

export async function sendMessage(request: unknown): Promise<AgentResponse> {
  try {
    // Validate request
    const { message, userId } = z.object({
      message: z.string(),
      userId: z.string()
    }).parse(request)

    // Check rate limit
    if (!checkRateLimit(userId)) {
      throw new RateLimitError('Rate limit exceeded')
    }

    // Get agent instance
    const agent = await getAgent()
    
    // Call agent
    const result = await agent.invoke({
      input: message
    })

    // Format response
    return {
      id: crypto.randomUUID(),
      content: result.response,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      metadata: {
        actions: result.actions?.map(action => ({
          type: 'analyze',
          tokenId: action,
          label: 'Analyze Token'
        }))
      }
    }

  } catch (error) {
    logger.error('Error in sendMessage:', error)
    throw error
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