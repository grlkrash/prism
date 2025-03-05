import { ChatOpenAI } from '@langchain/openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable')
}

export const chatModel = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
  modelName: 'gpt-4-turbo-preview'
}) 