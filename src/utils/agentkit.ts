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

export async function sendMessage({ message, userId, threadId, context }: SendMessageParams): Promise<AgentResponse> {
  try {
    // Log request
    console.info('[INFO] Agent request:', { message, userId, hasContext: !!context })

    // Get agent response
    const response = await fetch(`${process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:3007'}/api/agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, userId, threadId, context })
    })

    if (!response.ok) {
      throw new Error(`Agent request failed: ${response.status}`)
    }

    const data = await response.json()
    console.info('[INFO] Raw agent response:', data)

    // Parse recommendations from content
    const recommendations = parseRecommendations(data.content)
    const actions = parseActions(data.content)

    return {
      hasContent: true,
      metadata: {
        tokenRecommendations: recommendations,
        actions
      }
    }

  } catch (error) {
    console.error('[ERROR] Agent error:', error)
    return {
      hasContent: true,
      metadata: {
        tokenRecommendations: [],
        actions: []
      }
    }
  }
}

function parseRecommendations(content: string): any[] {
  try {
    const recommendations: any[] = []
    const lines = content.split('\n')
    
    let currentToken: any = null
    
    for (const line of lines) {
      // Match token line: "1. TokenName ($SYMBOL):"
      if (line.match(/^\d+\.\s+([^(]+)\s+\((\$[^)]+)\):/)) {
        // New token found
        if (currentToken) {
          recommendations.push(currentToken)
        }
        const [, name, symbol] = line.match(/^\d+\.\s+([^(]+)\s+\((\$[^)]+)\):/) || []
        currentToken = {
          name: name.trim(),
          symbol: symbol?.replace('$', '').trim(),
          description: '',
          imageUrl: `https://placehold.co/1200x630/png?text=${symbol?.replace('$', '') || name}`,
          price: 'Market Price'
        }
      } else if (currentToken && line.trim()) {
        currentToken.description += line.trim() + ' '
      }
    }
    
    if (currentToken) {
      recommendations.push(currentToken)
    }

    return recommendations
  } catch (error) {
    console.error('[ERROR] Failed to parse recommendations:', error)
    return []
  }
}

function parseActions(content: string): any[] {
  try {
    const actions: any[] = []
    const lines = content.split('\n')
    let inActionsSection = false
    
    for (const line of lines) {
      if (line.trim() === 'Actions:') {
        inActionsSection = true
        continue
      }
      
      if (inActionsSection && line.trim()) {
        const [action, symbol, label] = line.split('|')
        if (action && symbol && label) {
          actions.push({ action: action.trim(), symbol: symbol.trim(), label: label.trim() })
        }
      }
    }
    
    return actions
  } catch (error) {
    console.error('[ERROR] Failed to parse actions:', error)
    return []
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