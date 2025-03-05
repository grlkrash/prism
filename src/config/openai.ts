import { OpenAI } from '@langchain/openai'
import { ChatOpenAI } from '@langchain/openai'

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable')
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
  modelName: 'gpt-4-turbo-preview'
})

export const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4-turbo-preview',
  temperature: 0.7
}) 