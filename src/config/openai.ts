import { ChatOpenAI } from '@langchain/openai'
import { logger } from '@/utils/logger'

if (!process.env.OPENAI_API_KEY) {
  logger.error('OPENAI_API_KEY environment variable is missing')
  throw new Error('OpenAI API key not configured. Please check your environment variables.')
}

try {
  export const chatModel = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0.7,
    modelName: 'gpt-4-turbo-preview'
  })
} catch (error) {
  logger.error('Failed to initialize OpenAI chat model:', error)
  throw new Error('Failed to initialize OpenAI integration. Please check your configuration.')
} 