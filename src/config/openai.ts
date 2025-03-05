import { ChatOpenAI } from '@langchain/openai'
import { logger } from '@/utils/logger'

// Check for OpenAI API key with better error handling
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
if (!OPENAI_API_KEY) {
  logger.warn('OPENAI_API_KEY environment variable is missing. Using test mode.')
}

let chatModel: ChatOpenAI

try {
  if (!OPENAI_API_KEY) {
    // Create a mock chat model for testing
    chatModel = {
      isTestMode: true,
      async invoke() {
        return { content: 'Test response from mock OpenAI model' }
      }
    } as any
    logger.warn('Using mock OpenAI chat model for testing')
  } else {
    // Create real chat model with actual API key
    chatModel = new ChatOpenAI({
      apiKey: OPENAI_API_KEY,
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
  }
} catch (error) {
  logger.error('Failed to initialize OpenAI chat model:', error)
  // Fallback to mock model
  chatModel = {
    isTestMode: true,
    async invoke() {
      return { content: 'Test response from mock OpenAI model' }
    }
  } as any
  logger.warn('Using mock OpenAI chat model for testing')
}

export { chatModel } 