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
import { AgentExecutor } from "@langchain/core/agents"
import { HumanMessage } from "@langchain/core/messages"
import { searchCasts, getUserProfile, getTokenMentions } from '@/utils/farcaster'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { z as zod } from 'zod'
import { OpenAIFunctionsAgent } from "langchain/agents/openai"

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

// Action providers configuration
const actionTools = [
  new DynamicStructuredTool({
    name: 'wethAction',
    description: 'Interact with WETH token',
    schema: zod.object({
      input: zod.string().describe('The action to perform with WETH')
    }),
    func: async ({ input }) => {
      const provider = wethActionProvider()
      return JSON.stringify(await provider.execute(input))
    }
  }),
  new DynamicStructuredTool({
    name: 'pythAction',
    description: 'Get price data from Pyth',
    schema: zod.object({
      input: zod.string().describe('The price feed to query')
    }),
    func: async ({ input }) => {
      const provider = pythActionProvider()
      return JSON.stringify(await provider.execute(input))
    }
  }),
  new DynamicStructuredTool({
    name: 'walletAction',
    description: 'Interact with wallet',
    schema: zod.object({
      input: zod.string().describe('The wallet action to perform')
    }),
    func: async ({ input }) => {
      const provider = walletActionProvider()
      return JSON.stringify(await provider.execute(input))
    }
  }),
  new DynamicStructuredTool({
    name: 'erc20Action',
    description: 'Interact with ERC20 tokens',
    schema: zod.object({
      input: zod.string().describe('The ERC20 action to perform')
    }),
    func: async ({ input }) => {
      const provider = erc20ActionProvider()
      return JSON.stringify(await provider.execute(input))
    }
  }),
  new DynamicStructuredTool({
    name: 'cdpApiAction',
    description: 'Interact with CDP API',
    schema: zod.object({
      input: zod.string().describe('The CDP API action to perform')
    }),
    func: async ({ input }) => {
      const provider = cdpApiActionProvider({
        apiKeyName: AGENTKIT_CONFIG.CDP_API_KEY_NAME,
        apiKeyPrivateKey: AGENTKIT_CONFIG.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      })
      return JSON.stringify(await provider.execute(input))
    }
  }),
  new DynamicStructuredTool({
    name: 'cdpWalletAction',
    description: 'Interact with CDP wallet',
    schema: zod.object({
      input: zod.string().describe('The CDP wallet action to perform')
    }),
    func: async ({ input }) => {
      const provider = cdpWalletActionProvider({
        apiKeyName: AGENTKIT_CONFIG.CDP_API_KEY_NAME,
        apiKeyPrivateKey: AGENTKIT_CONFIG.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      })
      return JSON.stringify(await provider.execute(input))
    }
  })
]

// Farcaster tools
const farcasterTools = [
  new DynamicStructuredTool({
    name: 'searchCasts',
    description: 'Search Farcaster casts for cultural tokens and trends',
    schema: zod.object({
      query: zod.string().describe('The search query')
    }),
    func: async ({ query }) => {
      const results = await searchCasts(query)
      return JSON.stringify(results)
    }
  }),
  new DynamicStructuredTool({
    name: 'getUserProfile',
    description: 'Get a Farcaster user profile',
    schema: zod.object({
      fid: zod.string().describe('The Farcaster user ID')
    }),
    func: async ({ fid }) => {
      const profile = await getUserProfile(fid)
      return JSON.stringify(profile)
    }
  }),
  new DynamicStructuredTool({
    name: 'getTokenMentions',
    description: 'Get mentions of a specific token on Farcaster',
    schema: zod.object({
      tokenName: zod.string().describe('The token name to search for')
    }),
    func: async ({ tokenName }) => {
      const mentions = await getTokenMentions(tokenName)
      return JSON.stringify(mentions)
    }
  })
]

// Initialize the agent
const llm = new ChatOpenAI({
  modelName: AGENTKIT_CONFIG.MODEL,
  temperature: AGENTKIT_CONFIG.TEMPERATURE,
  maxTokens: AGENTKIT_CONFIG.MAX_TOKENS,
})

const tools = [...actionTools, ...farcasterTools]

let agentInstance: AgentExecutor | null = null

export async function getAgent() {
  if (!agentInstance) {
    const agent = OpenAIFunctionsAgent.fromLLMAndTools(llm, tools, {
      systemMessage: AGENTKIT_CONFIG.SYSTEM_PROMPT,
    })
    agentInstance = new AgentExecutor({
      agent,
      tools,
    })
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