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
    actions: z.array(z.any())
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