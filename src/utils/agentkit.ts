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
import { ChatOpenAI } from "@langchain/openai"
import { AgentExecutor } from "@langchain/core/agents"
import { createReactAgent } from "@langchain/langgraph/prebuilt"

class AgentkitError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message)
    this.name = 'AgentkitError'
  }
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
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
let agentInstance: any = null
const memory = new MemorySaver()

async function initializeAgent() {
  try {
    // Initialize LLM
    const llm = new ChatOpenAI({
      modelName: AGENTKIT_CONFIG.MODEL,
      temperature: AGENTKIT_CONFIG.TEMPERATURE,
      maxTokens: AGENTKIT_CONFIG.MAX_TOKENS,
    })

    // Configure CDP Wallet Provider
    const config = {
      apiKeyName: process.env.CDP_API_KEY_NAME,
      apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      networkId: process.env.NETWORK_ID || "base-sepolia",
    }

    const walletProvider = await CdpWalletProvider.configureWithWallet(config)

    // Initialize AgentKit
    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: [
        wethActionProvider(),
        pythActionProvider(),
        walletActionProvider(),
        erc20ActionProvider(),
        cdpApiActionProvider(config),
        cdpWalletActionProvider(config),
      ],
    })

    const tools = await getLangChainTools(agentkit)

    // Create React Agent with proper thread_id configuration
    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: AGENTKIT_CONFIG.SYSTEM_PROMPT,
    })

    // Wrap the agent to inject thread_id into each call
    const wrappedAgent = {
      invoke: async (input: any) => {
        return agent.invoke(input, {
          configurable: {
            thread_id: `grlkrash-agent-${crypto.randomUUID()}`
          }
        })
      },
      stream: async (input: any) => {
        return agent.stream(input, {
          configurable: {
            thread_id: `grlkrash-agent-${crypto.randomUUID()}`
          }
        })
      }
    }

    return wrappedAgent
  } catch (error) {
    logger.error('Failed to initialize agent:', error)
    throw error
  }
}

export async function getAgent() {
  if (!agentInstance) {
    agentInstance = await initializeAgent()
  }
  return agentInstance
}

export async function sendMessage(request: unknown): Promise<any> {
  try {
    // Validate request
    const { message, userId, context } = z.object({
      message: z.string(),
      userId: z.string().optional(),
      context: z.record(z.any()).optional()
    }).parse(request)

    // Check rate limit
    if (userId && !checkRateLimit(userId)) {
      throw new RateLimitError('Rate limit exceeded')
    }

    // Get agent instance
    const agent = await getAgent()
    
    // Generate thread ID
    const threadId = `grlkrash-agent-${crypto.randomUUID()}`
    
    // Call agent with message and thread ID
    const result = await agent.invoke({
      messages: [new HumanMessage(message)],
      configurable: {
        thread_id: threadId
      }
    })

    // Extract content from result
    let content = ''
    try {
      if (typeof result === 'string') {
        content = result
      } else if (result?.content) {
        content = typeof result.content === 'string' 
          ? result.content 
          : JSON.stringify(result.content)
      } else if (result?.messages?.[0]?.content) {
        content = typeof result.messages[0].content === 'string'
          ? result.messages[0].content
          : JSON.stringify(result.messages[0].content)
      }
    } catch (err) {
      logger.error('Error extracting content:', err)
      content = 'Error processing response'
    }

    // Extract recommendations and actions
    const tokenRecommendations = extractTokenRecommendations(content)
    const actions = extractActions(content)

    return {
      id: threadId,
      content,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      metadata: {
        tokenRecommendations,
        actions
      }
    }

  } catch (error) {
    logger.error('Error in sendMessage:', error)
    if (error instanceof z.ZodError) {
      throw new AgentkitError('Invalid request format', 400)
    }
    if (error instanceof RateLimitError) {
      throw new AgentkitError('Rate limit exceeded', 429)
    }
    throw new AgentkitError('Internal server error', 500)
  }
}

function extractTokenRecommendations(content: string) {
  try {
    if (!content) return []
    
    // Extract recommendations section
    const recommendationsMatch = content.match(/Token Recommendations:([\s\S]*?)(?=Actions:|$)/)
    if (!recommendationsMatch) return []
    
    const recommendationsText = recommendationsMatch[1].trim()
    const recommendations = recommendationsText.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const match = line.match(/\d+\.\s*([^:]+):\s*(.+)/)
        if (!match) return null
        
        return {
          id: crypto.randomUUID(),
          name: match[1].trim(),
          description: match[2].trim(),
          imageUrl: '', // Will be populated by MBD AI
          price: '0',
          culturalScore: Math.random() * 100 // Placeholder
        }
      })
      .filter(Boolean)
    
    return recommendations
  } catch (error) {
    logger.error('Error extracting recommendations:', error)
    return []
  }
}

function extractActions(content: string) {
  try {
    if (!content) return []
    
    const actionsMatch = content.match(/Actions:([\s\S]*?)$/)
    if (!actionsMatch) return []
    
    const actionsText = actionsMatch[1].trim()
    return actionsText.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [type, tokenId, label] = line.trim().split('|')
        return { type, tokenId, label }
      })
      .filter(action => action.type && action.tokenId && action.label)
  } catch (error) {
    logger.error('Error extracting actions:', error)
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