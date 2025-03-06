import { z } from 'zod'
import { chatModel } from './openai'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'
import { RunnableSequence } from '@langchain/core/runnables'
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { logger } from '@/utils/logger'

export const agentRequestSchema = z.object({
  message: z.string(),
  userId: z.string().optional(),
  context: z.record(z.any()).optional(),
  threadId: z.string().optional()
})

export type AgentRequest = z.infer<typeof agentRequestSchema>

export const agentResponseSchema = z.object({
  response: z.string(),
  recommendations: z.array(z.object({
    name: z.string(),
    symbol: z.string(),
    description: z.string(),
    culturalScore: z.number().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional()
  })).optional(),
  actions: z.array(z.object({
    type: z.string(),
    tokenId: z.string(),
    label: z.string()
  })).optional()
})

export type AgentResponse = z.infer<typeof agentResponseSchema>

export const AGENT_CONFIG = {
  model: chatModel,
  systemMessage: new SystemMessage(`You are an expert in cultural tokens and digital art.
Your role is to help users discover and understand cultural tokens.
Focus on tokens that represent art, music, media, and cultural experiences.

You have access to:
1. Trending tokens from Farcaster with their cultural scores (0-1)
2. MBD AI analysis of token content and imagery
3. Social context and community engagement metrics

When recommending tokens:
1. Prioritize tokens with high cultural scores (>0.7)
2. Consider the token's artistic and cultural elements
3. Factor in community engagement and social proof
4. Explain the cultural and artistic significance
5. Suggest relevant actions (view, buy, share)

Format your responses as:
Token Recommendations:
1. TokenName ($SYMBOL): Description focused on cultural and artistic significance
   Cultural Score: [0-1]
   Category: [art/music/culture/media]
   Tags: [comma-separated list]

Actions:
view|SYMBOL|View Details
buy|SYMBOL|Buy Now
share|SYMBOL|Share Token`),
  maxTokens: 1000,
  temperature: 0.7
}

export async function getAgent() {
  try {
    const chain = RunnableSequence.from([
      {
        question: (input: AgentRequest) => input.message,
        systemMessage: () => AGENT_CONFIG.systemMessage,
        threadId: (input: AgentRequest) => input.threadId || `cultural-agent-${crypto.randomUUID()}`
      },
      {
        response: async (input: { question: string; systemMessage: SystemMessage; threadId: string }) => {
          try {
            const response = await AGENT_CONFIG.model.invoke([
              input.systemMessage,
              new HumanMessage(input.question)
            ], {
              configurable: {
                thread_id: input.threadId
              }
            })

            const rawContent = response.content
            if (!rawContent || typeof rawContent !== 'string') {
              throw new Error('Invalid response from OpenAI')
            }

            logger.info('Agent response:', {
              threadId: input.threadId,
              hasContent: true,
              contentLength: rawContent.length
            })

            // Extract recommendations and actions from the text response
            const recommendations: Array<{
              name: string
              symbol: string
              description: string
              culturalScore?: number
              category?: string
              tags?: string[]
            }> = []

            const actions: Array<{
              type: string
              tokenId: string
              label: string
            }> = []

            // Parse recommendations
            const lines = rawContent.split('\n')
            let currentRecommendation: {
              name?: string
              symbol?: string
              description?: string
              culturalScore?: number
              category?: string
              tags?: string[]
            } = {}

            let inRecommendationsSection = false
            let inActionsSection = false

            for (const line of lines) {
              if (line.startsWith('Token Recommendations:')) {
                inRecommendationsSection = true
                inActionsSection = false
                continue
              }

              if (line.startsWith('Actions:')) {
                inRecommendationsSection = false
                inActionsSection = true
                continue
              }

              if (inRecommendationsSection) {
                // Match token name, symbol, and description
                const tokenMatch = line.match(/(\d+)\.\s+(.+?)\s+\((\$[A-Z]+)\):\s+(.+)/)
                if (tokenMatch) {
                  if (currentRecommendation.name) {
                    recommendations.push({ ...currentRecommendation })
                  }
                  currentRecommendation = {
                    name: tokenMatch[2],
                    symbol: tokenMatch[3].substring(1),
                    description: tokenMatch[4]
                  }
                  continue
                }

                // Match cultural score
                const scoreMatch = line.match(/Cultural Score:\s*([\d.]+)/)
                if (scoreMatch && currentRecommendation.name) {
                  currentRecommendation.culturalScore = parseFloat(scoreMatch[1])
                  continue
                }

                // Match category
                const categoryMatch = line.match(/Category:\s*(\w+)/)
                if (categoryMatch && currentRecommendation.name) {
                  currentRecommendation.category = categoryMatch[1]
                  continue
                }

                // Match tags
                const tagsMatch = line.match(/Tags:\s*\[(.*?)\]/)
                if (tagsMatch && currentRecommendation.name) {
                  currentRecommendation.tags = tagsMatch[1].split(',').map(tag => tag.trim())
                  continue
                }
              }

              if (inActionsSection) {
                const parts = line.split('|')
                if (parts.length === 3) {
                  actions.push({
                    type: parts[0].trim(),
                    tokenId: parts[1],
                    label: parts[2]
                  })
                }
              }
            }

            // Add the last recommendation if exists
            if (currentRecommendation.name) {
              recommendations.push({ ...currentRecommendation })
            }

            return {
              response: rawContent,
              recommendations,
              actions
            }
          } catch (error) {
            logger.error('Error in agent response:', error)
            throw error
          }
        }
      }
    ])

    return chain
  } catch (error) {
    logger.error('Error creating agent:', error)
    throw error
  }
}