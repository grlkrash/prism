import { z } from 'zod'
import { chatModel } from './openai'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'
import { RunnableSequence } from '@langchain/core/runnables'
import { ChatPromptTemplate } from "@langchain/core/prompts"

export const agentRequestSchema = z.object({
  message: z.string(),
  userId: z.string().optional(),
  context: z.record(z.any()).optional(),
  threadId: z.string().optional()
})

export const agentResponseSchema = z.object({
  id: z.string(),
  content: z.string(),
  role: z.string(),
  timestamp: z.string(),
  metadata: z.object({
    tokenRecommendations: z.array(z.any()),
    actions: z.array(z.any()),
    friendActivities: z.array(z.object({
      userId: z.string(),
      username: z.string(),
      action: z.enum(['buy', 'sell', 'share']),
      tokenId: z.string(),
      timestamp: z.string()
    })),
    referrals: z.array(z.object({
      referrerId: z.string(),
      referredId: z.string(),
      tokenId: z.string(),
      timestamp: z.string(),
      reward: z.number()
    }))
  })
})

export type AgentRequest = z.infer<typeof agentRequestSchema>
export type AgentResponse = z.infer<typeof agentResponseSchema>

const SYSTEM_PROMPT = `You are an AI assistant specializing in cultural tokens and NFTs. Your role is to:
1. Recommend ERC-20 tokens related to art, music, and culture based on:
   - Cultural relevance and impact
   - Community engagement and activity
   - Artist/creator reputation
   - Token utility and use cases
   - Market trends and sentiment
2. Analyze tokens for:
   - Cultural significance and context
   - Artistic value and creative elements
   - Community and social impact
   - Market potential and adoption
3. Provide insights on:
   - Token utility and features
   - Community engagement metrics
   - Cultural and artistic context
   - Market trends and opportunities
4. Format recommendations as structured data:
   {
     name: string
     symbol: string
     description: string
     culturalScore: number (0-1)
     category: 'art' | 'music' | 'culture' | 'media' | 'entertainment'
     tags: string[]
     analysis: {
       culturalContext: string
       artStyle?: string
       sentiment: number
       popularity: number
     }
   }

Example response structure:
{
  "recommendations": [
    {
      "name": "Digital Art DAO",
      "symbol": "DART",
      "description": "Governance token for digital art curation",
      "culturalScore": 0.85,
      "category": "art",
      "tags": ["digital art", "curation", "governance"],
      "analysis": {
        "culturalContext": "Web3 art movement",
        "artStyle": "Digital Contemporary",
        "sentiment": 0.9,
        "popularity": 0.8
      }
    }
  ],
  "actions": [
    {
      "type": "view",
      "tokenId": "DART",
      "label": "View Details"
    }
  ]
}`

export const AGENT_CONFIG = {
  model: chatModel,
  systemMessage: new SystemMessage(SYSTEM_PROMPT),
  temperature: 0.7,
  maxTokens: 1000,
  functions: [
    {
      name: 'analyzeCulturalToken',
      description: 'Analyze a token for cultural relevance and artistic value',
      parameters: {
        type: 'object',
        properties: {
          token: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              symbol: { type: 'string' },
              description: { type: 'string' }
            },
            required: ['name', 'symbol', 'description']
          }
        },
        required: ['token']
      }
    }
  ]
}

export async function getAgent() {
  const chain = RunnableSequence.from([
    {
      question: (input: AgentRequest) => input.message,
      systemMessage: () => AGENT_CONFIG.systemMessage,
      threadId: (input: AgentRequest) => input.threadId || `cultural-agent-${crypto.randomUUID()}`
    },
    {
      response: async (input: { question: string; systemMessage: SystemMessage; threadId: string }) => {
        const response = await AGENT_CONFIG.model.invoke([
          input.systemMessage,
          new HumanMessage(input.question)
        ], {
          configurable: {
            thread_id: input.threadId
          }
        })
        return response.content
      }
    }
  ])
  
  return chain
}