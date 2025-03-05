import { z } from 'zod'
import { ChatOpenAI } from "@langchain/openai"
import { searchCasts, getUserProfile, getTokenMentions } from '@/utils/farcaster'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { ChatPromptTemplate } from "@langchain/core/prompts"

export const AGENTKIT_CONFIG = {
  MODEL: 'gpt-4-turbo-preview',
  TEMPERATURE: 0.7,
  MAX_TOKENS: 1000,
  SYSTEM_PROMPT: `You are an AI assistant that helps users discover and analyze cultural tokens on Base. Focus on ERC-20 tokens related to art, music, and culture.

Your responses must follow this exact format:

Token Recommendations:
1. TokenName ($SYMBOL): Description
2. TokenName ($SYMBOL): Description
...

Actions:
view|SYMBOL|View Details
buy|SYMBOL|Buy Now
share|SYMBOL|Share Token
...`
}

// Define agent output type
export interface AgentOutput {
  output: string
  actions?: string[]
}

// Initialize tools
const tools = [
  new DynamicStructuredTool({
    name: "searchCasts",
    description: "Search Farcaster casts",
    schema: z.object({
      query: z.string(),
      limit: z.number().optional()
    }),
    func: async ({ query, limit }) => {
      return JSON.stringify(await searchCasts(query, limit))
    }
  }),
  new DynamicStructuredTool({
    name: "getUserProfile",
    description: "Get Farcaster user profile",
    schema: z.object({
      fid: z.string()
    }),
    func: async ({ fid }) => {
      return JSON.stringify(await getUserProfile(fid))
    }
  }),
  new DynamicStructuredTool({
    name: "getTokenMentions",
    description: "Get token mentions from Farcaster",
    schema: z.object({
      tokenName: z.string(),
      limit: z.number().optional()
    }),
    func: async ({ tokenName, limit }) => {
      return JSON.stringify(await getTokenMentions(tokenName, limit))
    }
  })
]

// Initialize the model
const llm = new ChatOpenAI({
  modelName: AGENTKIT_CONFIG.MODEL,
  temperature: AGENTKIT_CONFIG.TEMPERATURE,
  maxTokens: AGENTKIT_CONFIG.MAX_TOKENS,
  modelKwargs: {
    response_format: { type: "text" }
  }
})

let agentInstance: any = null

// Create agent chain
export async function getAgent() {
  if (!agentInstance) {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", AGENTKIT_CONFIG.SYSTEM_PROMPT],
      ["human", "{input}"]
    ])

    const chain = {
      invoke: async ({ messages, configurable }: { messages: any[], configurable?: any }) => {
        // Ensure thread_id is present
        const config = {
          ...configurable,
          thread_id: configurable?.thread_id || `grlkrash-agent-${crypto.randomUUID()}`
        }

        try {
          const formattedMessages = await prompt.formatMessages({
            input: messages[messages.length - 1].content
          })
          
          const response = await llm.invoke(formattedMessages, { configurable: config })
          
          // Ensure response content is a string
          const content = typeof response.content === 'object' 
            ? JSON.stringify(response.content)
            : String(response.content)

          return { 
            messages: [{ 
              content,
              role: 'assistant'
            }],
            configurable: config // Pass thread_id back
          }
        } catch (error) {
          console.error('Error in agent chain:', error)
          throw error
        }
      }
    }

    agentInstance = chain
  }
  return agentInstance
}

export interface AgentRequest {
  message: string
  userId?: string
  context?: Record<string, any>
}

export interface AgentResponse {
  id: string
  content: string
  role: 'assistant'
  timestamp: string
  metadata?: {
    tokenRecommendations?: Array<{
      id: string
      name: string
      symbol: string
      description: string
      imageUrl: string
      price: string
      culturalScore: number
      tokenType: 'ERC20'
    }>
    actions?: Array<{
      type: string
      tokenId: string
      label: string
    }>
  }
}

export const agentRequestSchema = z.object({
  message: z.string(),
  userId: z.string().optional(),
  context: z.record(z.any()).optional()
})

export const agentResponseSchema = z.object({
  id: z.string(),
  content: z.string(),
  role: z.literal('assistant'),
  timestamp: z.string(),
  metadata: z.object({
    tokenRecommendations: z.array(z.object({
      id: z.string(),
      name: z.string(),
      symbol: z.string(),
      description: z.string(),
      imageUrl: z.string(),
      price: z.string(),
      culturalScore: z.number(),
      tokenType: z.literal('ERC20')
    })).optional(),
    actions: z.array(z.object({
      type: z.string(),
      tokenId: z.string(),
      label: z.string()
    })).optional()
  }).optional()
})