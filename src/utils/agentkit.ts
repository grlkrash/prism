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
import { AGENTKIT_CONFIG, AgentRequest, AgentResponse, agentRequestSchema, agentResponseSchema } from '@/config/agentkit'
import { logger } from './logger'
import { analyzeToken } from './mbdAi'
import { getLangChainTools } from "@coinbase/agentkit-langchain"
import { HumanMessage } from "@langchain/core/messages"
import { MemorySaver } from "@langchain/langgraph"
import { ChatOpenAI } from "@langchain/openai"
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

    // Initialize AgentKit with all action providers
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

    // Create a custom agent executor
    const executor = {
      invoke: async (input: { messages: any[], configurable?: any }) => {
        const threadId = input.configurable?.thread_id || `grlkrash-agent-${crypto.randomUUID()}`
        
        try {
          // Format the input message
          const lastMessage = input.messages[input.messages.length - 1]
          const prompt = `${AGENTKIT_CONFIG.SYSTEM_PROMPT}\n\nHuman: ${lastMessage.content}\n\nAssistant:`

          // Call LLM with tools
          const response = await llm.invoke(prompt, {
            tools,
            configurable: { thread_id: threadId }
          })

          // Format the response
          const content = typeof response.content === 'object'
            ? JSON.stringify(response.content)
            : String(response.content || '')

          return {
            messages: [{ content, role: 'assistant' }],
            configurable: { thread_id: threadId }
          }
        } catch (error) {
          logger.error('Error in agent execution:', error)
          throw error
        }
      }
    }

    return executor
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

export async function sendMessage(request: unknown): Promise<AgentResponse> {
  try {
    logger.debug('Starting sendMessage with request:', request)

    // Validate request
    const { message, userId, context } = z.object({
      message: z.string(),
      userId: z.string().optional(),
      context: z.record(z.any()).optional()
    }).parse(request)

    logger.debug('Request validated successfully')

    // Check rate limit
    if (userId && !checkRateLimit(userId)) {
      logger.warn('Rate limit exceeded for user:', userId)
      throw new RateLimitError('Rate limit exceeded')
    }

    // Get agent instance
    logger.debug('Getting agent instance')
    const agent = await getAgent()
    const threadId = `grlkrash-agent-${crypto.randomUUID()}`
    
    logger.debug('Calling agent with message:', { message, threadId })
    
    // Call agent with message and thread ID
    const result = await agent.invoke({
      messages: [new HumanMessage(message)],
      configurable: { thread_id: threadId }
    })

    logger.debug('Agent response received:', result)

    // Extract content and ensure it's a string
    const content = typeof result.messages[0].content === 'object'
      ? JSON.stringify(result.messages[0].content)
      : String(result.messages[0].content)

    logger.debug('Content extracted:', content)

    // Extract recommendations and actions
    const tokenRecommendations = extractTokenRecommendations(content)
    const actions = extractActions(content)

    logger.debug('Extracted data:', { tokenRecommendations, actions })

    // Construct and validate response
    const response: AgentResponse = {
      id: threadId,
      content,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      metadata: {
        tokenRecommendations,
        actions
      }
    }

    logger.debug('Validating response')
    return agentResponseSchema.parse(response)

  } catch (error) {
    logger.error('Error in sendMessage:', error)
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

interface TokenRecommendation {
  id: string
  name: string
  description: string
  imageUrl: string
  price: string
  culturalScore: number
}

function extractTokenRecommendations(content: unknown): TokenRecommendation[] {
  try {
    if (!content) return []
    
    // Ensure content is a string
    const contentStr = typeof content === 'object' 
      ? JSON.stringify(content)
      : String(content)
    
    // Try parsing as JSON first
    try {
      const parsed = JSON.parse(contentStr)
      if (Array.isArray(parsed?.recommendations)) {
        return parsed.recommendations.map((rec: any) => ({
          id: crypto.randomUUID(),
          name: rec.name || 'Unknown Token',
          description: rec.description || '',
          imageUrl: rec.imageUrl || '',
          price: rec.price || '0',
          culturalScore: rec.culturalScore || Math.floor(Math.random() * 100)
        }))
      }
    } catch (e) {
      // Not JSON, continue with text parsing
    }
    
    // Extract recommendations section using regex
    const recommendationsMatch = contentStr.match(/Token Recommendations:([\s\S]*?)(?=Actions:|$)/)
    if (!recommendationsMatch) return []
    
    const recommendationsText = recommendationsMatch[1].trim()
    const recommendations = recommendationsText.split('\n')
      .filter(line => line.trim())
      .map(line => {
        // Match numbered items like "1. TokenName: Description"
        const match = line.match(/^\d+\.\s*([^:]+):\s*(.+)/)
        if (!match) return null
        
        return {
          id: crypto.randomUUID(),
          name: match[1].trim(),
          description: match[2].trim(),
          imageUrl: '', // Will be populated by MBD AI later
          price: '0',
          culturalScore: Math.floor(Math.random() * 100)
        }
      })
      .filter((rec): rec is TokenRecommendation => rec !== null)

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
    const validActionTypes = ['view', 'buy', 'share', 'analyze', 'farcaster'] as const
    type ActionType = typeof validActionTypes[number]

    return actionsText.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [type, tokenId, label] = line.trim().split('|')
        // Validate action type
        if (!type || !tokenId || !label || !validActionTypes.includes(type as ActionType)) {
          return null
        }
        return { 
          type: type as ActionType, 
          tokenId, 
          label 
        }
      })
      .filter((action): action is { type: ActionType; tokenId: string; label: string } => 
        action !== null
      )
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