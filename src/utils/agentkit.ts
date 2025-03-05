import { AgentRequest, AgentResponse, agentRequestSchema, agentResponseSchema, getAgent } from '@/config/agentkit'
import { logger } from './logger'
import { analyzeToken, Token } from './mbdAi'
import { HumanMessage } from "@langchain/core/messages"
import { getFarcasterFollowing, getFarcasterCasts } from './farcaster'
import { getPersonalizedFeed } from './feed'
import { Cast } from './mbdAi'

// SocialFi types
interface FriendActivity {
  userId: string
  username: string
  action: 'buy' | 'sell' | 'share'
  tokenId: string
  timestamp: string
  category?: 'art' | 'music' | 'culture' | 'media' | 'entertainment'
  culturalContext?: string
}

interface Referral {
  referrerId: string
  referredId: string
  tokenId: string
  timestamp: string
  reward: number
}

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
  // In a real implementation, this would store in a database
  return activity
}

export async function getFriendActivities(userId?: string) {
  try {
    // If no userId provided, return Dan Romero's activity
    if (!userId) {
      const danRomeroCasts = await getFarcasterCasts('3', 10)
      return danRomeroCasts.map((cast: { hash: string; timestamp: string }) => ({
        username: 'danromero',
        action: 'interacted with',
        tokenId: cast.hash,
        timestamp: cast.timestamp
      }))
    }

    const following = await getFarcasterFollowing(userId)
    if (!following?.length) {
      // If no following found, return Dan Romero's activity
      const danRomeroCasts = await getFarcasterCasts('3', 10)
      return danRomeroCasts.map((cast: { hash: string; timestamp: string }) => ({
        username: 'danromero',
        action: 'interacted with',
        tokenId: cast.hash,
        timestamp: cast.timestamp
      }))
    }
    
    const activities = await Promise.all(
      following.map(async (fid: string) => {
        const feed = await getPersonalizedFeed(fid)
        return feed?.casts?.map((cast) => ({
          username: cast.author.username,
          action: 'interacted with',
          tokenId: cast.hash,
          timestamp: cast.timestamp
        })) || []
      })
    )
    
    return activities.flat().sort((a, b) => b.timestamp - a.timestamp)
  } catch (error) {
    logger.error('Error fetching friend activities:', error)
    // On error, return Dan Romero's activity as fallback
    try {
      const danRomeroCasts = await getFarcasterCasts('3', 10)
      return danRomeroCasts.map((cast: { hash: string; timestamp: string }) => ({
        username: 'danromero',
        action: 'interacted with',
        tokenId: cast.hash,
        timestamp: cast.timestamp
      }))
    } catch (fallbackError) {
      logger.error('Error fetching Dan Romero activity:', fallbackError)
      return []
    }
  }
}

export async function trackReferral(referral: Referral) {
  // In a real implementation, this would store in a database
  return referral
}

export async function getReferrals(userId: string): Promise<Referral[]> {
  // In a real implementation, this would fetch from a database
  return []
}

export async function sendMessage(request: AgentRequest): Promise<AgentResponse> {
  try {
    const validatedRequest = agentRequestSchema.parse(request)
    const agent = await getAgent()

    const result = await agent.invoke(validatedRequest)
    const agentResponse = result.response

    // Log the raw response for debugging
    logger.info('Raw agent response:', {
      content: agentResponse.content,
      hasRecommendations: Array.isArray(agentResponse.recommendations),
      recommendationsCount: agentResponse.recommendations?.length,
      hasActions: Array.isArray(agentResponse.actions),
      actionsCount: agentResponse.actions?.length
    })
    
    // Add friend activities to response if requested
    let friendActivities: FriendActivity[] = []
    if (validatedRequest.userId) {
      try {
        friendActivities = await getFriendActivities(validatedRequest.userId)
      } catch (error) {
        logger.error('Error fetching friend activities:', error)
      }
    }

    // Process recommendations to ensure they have all required fields
    const tokenRecommendations = Array.isArray(agentResponse.recommendations) ? 
      agentResponse.recommendations.map(rec => ({
        id: crypto.randomUUID(),
        name: rec.name,
        symbol: rec.symbol,
        description: rec.description,
        culturalScore: rec.culturalScore || Math.floor(Math.random() * 100),
        category: rec.category || 'art',
        tags: rec.tags || ['art', 'culture']
      })) : []

    // Process actions to ensure they have all required fields
    const actions = Array.isArray(agentResponse.actions) ?
      agentResponse.actions.map(action => ({
        type: action.type,
        tokenId: action.tokenId,
        label: action.label
      })) : []

    // Ensure we have a valid response object
    const responseObj: AgentResponse = {
      id: crypto.randomUUID(),
      content: agentResponse.content || 'No response content',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      metadata: {
        tokenRecommendations,
        actions,
        friendActivities,
        referrals: []
      }
    }

    // Try to get referrals if we have a userId
    if (validatedRequest.userId) {
      try {
        responseObj.metadata.referrals = await getReferrals(validatedRequest.userId)
      } catch (error) {
        logger.error('Error fetching referrals:', error)
      }
    }

    // Log the final response for debugging
    logger.info('Final response:', {
      hasContent: !!responseObj.content,
      recommendationsCount: responseObj.metadata.tokenRecommendations.length,
      actionsCount: responseObj.metadata.actions.length,
      friendActivitiesCount: responseObj.metadata.friendActivities.length,
      referralsCount: responseObj.metadata.referrals.length
    })

    // Validate the response against our schema
    return agentResponseSchema.parse(responseObj)
  } catch (error) {
    logger.error('Error in sendMessage:', error)
    
    // Return a valid error response that matches our schema
    return agentResponseSchema.parse({
      id: crypto.randomUUID(),
      content: error instanceof Error ? error.message : 'Internal server error',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      metadata: {
        tokenRecommendations: [],
        actions: [],
        friendActivities: [],
        referrals: []
      }
    })
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