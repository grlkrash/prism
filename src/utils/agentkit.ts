import { AgentRequest, AgentResponse, agentRequestSchema, agentResponseSchema, getAgent } from '@/config/agentkit'
import { logger } from './logger'
import { analyzeToken, Token } from './mbdAi'
import { HumanMessage } from "@langchain/core/messages"

// SocialFi types
interface FriendActivity {
  userId: string
  username: string
  action: 'buy' | 'sell' | 'share'
  tokenId: string
  timestamp: string
}

interface Referral {
  referrerId: string
  referredId: string
  tokenId: string
  timestamp: string
  reward: number
}

// In-memory storage for demo purposes
const friendActivities: FriendActivity[] = []
const referrals: Referral[] = []

export class AgentkitError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number = 500, code?: string) {
    super(message)
    this.name = 'AgentkitError'
    this.status = status
    this.code = code
  }
}

// SocialFi functions
export async function trackFriendActivity(activity: FriendActivity) {
  friendActivities.push(activity)
  return activity
}

export async function getFriendActivities(userId: string): Promise<FriendActivity[]> {
  return friendActivities.filter(activity => activity.userId === userId)
}

export async function trackReferral(referral: Referral) {
  referrals.push(referral)
  return referral
}

export async function getReferrals(userId: string): Promise<Referral[]> {
  return referrals.filter(ref => ref.referrerId === userId)
}

export async function sendMessage(request: AgentRequest): Promise<AgentResponse> {
  try {
    const validatedRequest = agentRequestSchema.parse(request)
    const agent = await getAgent()

    const response = await agent.invoke(validatedRequest)
    const responseContent = typeof response === 'string' ? response : 
      typeof response === 'object' && 'content' in response ? String(response.content) : 
      String(response)

    // Add friend activities to response if requested
    let friendActivities: FriendActivity[] = []
    if (validatedRequest.userId) {
      friendActivities = await getFriendActivities(validatedRequest.userId)
    }

    const result: AgentResponse = {
      id: crypto.randomUUID(),
      content: responseContent,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      metadata: {
        tokenRecommendations: await extractTokenRecommendations(responseContent),
        actions: extractActions(responseContent),
        friendActivities,
        referrals: validatedRequest.userId ? await getReferrals(validatedRequest.userId) : []
      }
    }

    return agentResponseSchema.parse(result)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    logger.error('Error in sendMessage:', error)
    throw new AgentkitError(errorMessage)
  }
}

function extractActions(content: string): Array<{ type: string; tokenId: string; label: string }> {
  const actions: Array<{ type: string; tokenId: string; label: string }> = []
  const lines = content.split('\n')
  let inActionsSection = false

  for (const line of lines) {
    if (line.trim() === 'Actions:') {
      inActionsSection = true
      continue
    }

    if (inActionsSection && line.includes('|')) {
      const [type, tokenId, label] = line.split('|')
      if (type && tokenId && label) {
        actions.push({ type: type.trim(), tokenId: tokenId.trim(), label: label.trim() })
      }
    }
  }

  return actions
}

async function extractTokenRecommendations(content: string): Promise<Token[]> {
  const recommendations: Token[] = []
  const lines = content.split('\n')
  let inRecommendationsSection = false

  for (const line of lines) {
    if (line.includes('Token Recommendations:')) {
      inRecommendationsSection = true
      continue
    }

    if (inRecommendationsSection && line.match(/^\d+\./)) {
      const match = line.match(/(\d+)\.\s+([^(]+)\s+\((\$[^)]+)\):\s+(.+)/)
      if (match) {
        const [_, number, name, symbol, description] = match
        const token: Token = {
          id: crypto.randomUUID(),
          name: name.trim(),
          symbol: symbol.replace('$', '').trim(),
          description: description.trim(),
          imageUrl: '',
          artistName: 'Unknown Artist', // Required by Token type
          price: '0',
          culturalScore: Math.floor(Math.random() * 100),
          tokenType: 'ERC20'
        }
        
        try {
          const analyzedToken = await analyzeToken(token)
          recommendations.push(analyzedToken)
        } catch (error) {
          logger.error('Error analyzing token:', { error, tokenId: token.id })
          recommendations.push(token)
        }
      }
    }
  }

  return recommendations
}

export async function getTokenRecommendations(userId: string, preferences?: {
  interests?: string[]
  priceRange?: { min?: number; max?: number }
}): Promise<AgentResponse> {
  // Ensure priceRange has both min and max values
  const normalizedPreferences = preferences ? {
    ...preferences,
    priceRange: preferences.priceRange ? {
      min: preferences.priceRange.min || 0,
      max: preferences.priceRange.max || 1000
    } : undefined
  } : undefined

  return sendMessage({
    message: 'Please recommend some cultural tokens based on my preferences and Farcaster trends.',
    userId,
    context: {
      userPreferences: normalizedPreferences
    }
  })
}

export async function analyzeTokenWithAgent(tokenId: string, userId: string): Promise<AgentResponse> {
  return sendMessage({
    message: `Please analyze this token and provide insights, including Farcaster sentiment: ${tokenId}`,
    userId,
    context: {
      currentToken: {
        id: tokenId,
        name: 'Token Name', // This should be fetched from your database
        description: 'Token Description',
        imageUrl: 'https://example.com/token.jpg',
        price: '0.1 ETH'
      }
    }
  })
} 