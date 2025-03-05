import { ChatOpenAI } from '@langchain/openai'
import { logger } from '@/utils/logger'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required')
}

export const chatModel = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
  modelName: 'gpt-4-turbo-preview',
  configuration: {
    baseURL: process.env.OPENAI_API_BASE_URL,
    defaultHeaders: {
      'Content-Type': 'application/json'
    },
    defaultQuery: {}
  }
}) 