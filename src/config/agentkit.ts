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
1. Recommend ERC-20 tokens related to art, music, and culture
2. Analyze token potential and cultural impact
3. Provide insights on token utility and community engagement
4. Format recommendations as: "1. TokenName ($SYMBOL): Description"
5. Include Actions section with format: "type|tokenId|label"

Example response structure:
Token Recommendations:
1. TokenName ($SYMBOL): Description of the token and its cultural significance.

Actions:
view|SYMBOL|View Details
buy|SYMBOL|Buy Now
share|SYMBOL|Share Token`

export const AGENT_CONFIG = {
  model: chatModel,
  systemMessage: new SystemMessage(SYSTEM_PROMPT)
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
          } = {}

          let inRecommendationsSection = false
          let inActionsSection = false

          for (const line of lines) {
            const trimmedLine = line.trim()
            
            if (trimmedLine.toLowerCase().includes('token recommendations:')) {
              inRecommendationsSection = true
              continue
            }

            if (trimmedLine.toLowerCase() === 'actions:') {
              inRecommendationsSection = false
              inActionsSection = true
              continue
            }

            if (inRecommendationsSection && trimmedLine.match(/^\d+\./)) {
              // If we have a previous recommendation, add it
              if (currentRecommendation.name && currentRecommendation.symbol && currentRecommendation.description) {
                recommendations.push({
                  name: currentRecommendation.name,
                  symbol: currentRecommendation.symbol,
                  description: currentRecommendation.description,
                  culturalScore: Math.random() * 100,
                  category: 'art',
                  tags: ['art', 'culture']
                })
              }

              // Start new recommendation
              const match = trimmedLine.match(/\d+\.\s+([^(]+)\s+\((\$[^)]+)\):\s+(.+)/)
              if (match) {
                const [_, name, symbol, description] = match
                currentRecommendation = {
                  name: name.trim(),
                  symbol: symbol.replace('$', '').trim(),
                  description: description.trim()
                }
              }
            } else if (inRecommendationsSection && currentRecommendation.description) {
              // Append to current description if we're in a recommendation
              currentRecommendation.description += ' ' + trimmedLine
            }

            if (inActionsSection && trimmedLine.includes('|')) {
              const [type, tokenId, label] = trimmedLine.split('|').map(s => s.trim())
              if (type && tokenId && label) {
                actions.push({ type, tokenId, label })
              }
            }
          }

          // Add the last recommendation if exists
          if (currentRecommendation.name && currentRecommendation.symbol && currentRecommendation.description) {
            recommendations.push({
              name: currentRecommendation.name,
              symbol: currentRecommendation.symbol,
              description: currentRecommendation.description,
              culturalScore: Math.random() * 100,
              category: 'art',
              tags: ['art', 'culture']
            })
          }

          return {
            content: rawContent,
            recommendations,
            actions
          }
        } catch (error) {
          console.error('Error in agent response:', error)
          return {
            content: error instanceof Error ? error.message : 'Failed to process request',
            recommendations: [],
            actions: []
          }
        }
      }
    }
  ])
  
  return chain
}