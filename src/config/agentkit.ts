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
import { ChatOpenAI } from "@langchain/openai"
import { SystemMessage } from "@langchain/core/messages"
import { searchCasts, getUserProfile, getTokenMentions } from '@/utils/farcaster'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { createStructuredOutputChainFromZod } from "langchain/chains/openai_functions"

export const AGENTKIT_CONFIG = {
  API_URL: process.env.AGENTKIT_API_URL || 'https://api.agentkit.coinbase.com',
  API_KEY: process.env.AGENTKIT_API_KEY || '',
  CDP_API_KEY_NAME: process.env.CDP_API_KEY_NAME || '',
  CDP_API_KEY_PRIVATE_KEY: process.env.CDP_API_KEY_PRIVATE_KEY || '',
  NETWORK_ID: process.env.NETWORK_ID || 'base-sepolia',
  MODEL: process.env.AGENTKIT_MODEL || 'gpt-4-turbo-preview',
  MAX_TOKENS: 1000,
  TEMPERATURE: 0.7,
  TOP_P: 0.9,
  FREQUENCY_PENALTY: 0.5,
  PRESENCE_PENALTY: 0.5,
  STOP: ['\n\n', 'Human:', 'Assistant:'],
  SYSTEM_PROMPT: `You are a helpful AI assistant for the GRLKRASHai platform. You help users discover and interact with cultural tokens on Base. You have access to MBD AI for token analysis and recommendations. You can also interact with Farcaster to find cultural tokens and trends.`,
  ERROR_MESSAGES: {
    API_ERROR: 'Failed to communicate with Agentkit API',
    RATE_LIMIT: 'Rate limit exceeded. Please try again later.',
    INVALID_REQUEST: 'Invalid request parameters',
    UNAUTHORIZED: 'Unauthorized access',
    NOT_FOUND: 'Resource not found',
    SERVER_ERROR: 'Internal server error'
  }
}

// Initialize tools
const farcasterTools = [
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
  openAIApiKey: process.env.OPENAI_API_KEY,
})

let agentInstance: any = null

export async function getAgent() {
  if (!agentInstance) {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", AGENTKIT_CONFIG.SYSTEM_PROMPT],
      ["human", "{input}"]
    ])

    const chain = await createStructuredOutputChainFromZod(z.object({
      response: z.string(),
      actions: z.array(z.string()).optional()
    }), {
      llm,
      prompt,
      outputParser: undefined,
    })

    agentInstance = chain
  }
  return agentInstance
}

export const agentResponseSchema = z.object({
  id: z.string(),
  content: z.string(),
  role: z.enum(['assistant', 'user']),
  timestamp: z.string(),
  metadata: z.object({
    tokenRecommendations: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      imageUrl: z.string(),
      price: z.string(),
      culturalScore: z.number().optional(),
      farcasterData: z.object({
        castHash: z.string().optional(),
        author: z.string().optional(),
        likes: z.number().optional(),
        recasts: z.number().optional(),
      }).optional()
    })).optional(),
    actions: z.array(z.object({
      type: z.enum(['view', 'buy', 'share', 'analyze', 'farcaster']),
      tokenId: z.string(),
      label: z.string()
    })).optional()
  }).optional()
})

export type AgentResponse = z.infer<typeof agentResponseSchema>

export const agentRequestSchema = z.object({
  message: z.string(),
  userId: z.string().optional(),
  context: z.object({
    currentToken: z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      imageUrl: z.string(),
      price: z.string()
    }).optional(),
    userPreferences: z.object({
      interests: z.array(z.string()).optional(),
      priceRange: z.object({
        min: z.number().optional(),
        max: z.number().optional()
      }).optional()
    }).optional(),
    farcasterContext: z.object({
      client: z.any().optional(),
      userFid: z.string().optional()
    }).optional()
  }).optional()
})

export type AgentRequest = z.infer<typeof agentRequestSchema>