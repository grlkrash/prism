import { ChatOpenAI } from '@langchain/openai'
import { logger } from '@/utils/logger'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required')
}

// Initialize OpenAI chat model with proper configuration
export const chatModel = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
  modelName: 'gpt-4-turbo-preview',
  configuration: {
    baseURL: process.env.OPENAI_API_BASE_URL,
    defaultHeaders: {
      'Content-Type': 'application/json',
      'User-Agent': 'Prism/1.0'
    },
    defaultQuery: {}
  },
  callbacks: [
    {
      handleLLMStart: async () => {
        logger.info('Starting LLM request')
      },
      handleLLMEnd: async () => {
        logger.info('Completed LLM request')
      },
      handleLLMError: async (error) => {
        logger.error('LLM error:', error)
      }
    }
  ]
}) 