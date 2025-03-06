import { AgentRequest, AgentResponse, agentRequestSchema, agentResponseSchema, getAgent } from '@/config/agentkit'
import { logger } from './logger'
import { analyzeToken, Token } from './mbdAi'
import { HumanMessage } from "@langchain/core/messages"
import { getFarcasterFollowing, getFarcasterCasts, extractTokenMentions, getTokenMentions } from './farcaster'
import { getPersonalizedFeed } from './feed'
import { Cast } from './mbdAi'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const CDP_API_KEY = process.env.CDP_API_KEY_NAME || process.env.AGENTKIT_API_KEY
const CDP_PRIVATE_KEY = process.env.CDP_API_KEY_PRIVATE_KEY || process.env.FARCASTER_PRIVATE_KEY

interface TokenMention {
  tokenId: string
  category?: string
  socialContext?: {
    mentions: number
    reactions: number
  }
  culturalScore?: number
  analysis?: Token
}

interface SendMessageParams {
  message: string
  userId: string
  threadId?: string
  context?: Record<string, any>
}

// SocialFi types
interface FriendActivity {
  timestamp?: string
  userId?: string
  username?: string
  action?: string
  tokenId: string
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

// Default fallback token for error cases
const fallbackToken: Token = {
  id: 'fallback-1',
  name: 'Example Cultural Token',
  symbol: 'CULTURE',
  description: 'A demonstration cultural token for testing purposes',
  imageUrl: 'https://example.com/token.jpg',
  artistName: 'Demo Artist',
  price: '0.1 ETH',
  culturalScore: 80,
  tokenType: 'ERC20',
  aiAnalysis: {
    culturalScore: 80,
    hasCulturalElements: true,
    category: 'art',
    tags: ['demo', 'cultural'],
    sentiment: 'positive',
    popularity: 0.8,
    aiScore: 0.85
  }
}

export async function sendMessage(params: SendMessageParams): Promise<AgentResponse> {
  try {
    // Check for required API keys
    if (!CDP_API_KEY || !CDP_PRIVATE_KEY) {
      logger.warn('CDP API configuration missing, using fallback response')
      return {
        response: 'I apologize, but I cannot process your request at the moment. Please check API configuration.',
        recommendations: [fallbackToken],
        actions: []
      }
    }

    // Get Farcaster context if available
    let farcasterContext = {}
    if (process.env.FARCASTER_API_KEY && params.userId) {
      try {
        const [following, casts] = await Promise.all([
          getFarcasterFollowing(params.userId),
          getFarcasterCasts(params.userId, 10)
        ])
        farcasterContext = {
          following,
          recentCasts: casts,
          fid: params.userId
        }
      } catch (error) {
        logger.error('Failed to get Farcaster context:', error)
      }
    }

    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CDP-API-Key': CDP_API_KEY,
        'X-CDP-Private-Key': CDP_PRIVATE_KEY,
        'X-Farcaster-API-Key': process.env.FARCASTER_API_KEY || ''
      },
      body: JSON.stringify({
        ...params,
        context: {
          ...params.context,
          ...farcasterContext,
          cdpApiKey: CDP_API_KEY,
          cdpPrivateKey: CDP_PRIVATE_KEY
        }
      })
    })

    if (!response.ok) {
      throw new AgentkitError(`Agent request failed: ${response.statusText}`, response.status)
    }

    const data = await response.json()
    
    // Enhance recommendations with Farcaster data if available
    let recommendations = data.recommendations || []
    if (process.env.FARCASTER_API_KEY && recommendations.length > 0) {
      try {
        const enhancedRecommendations = await Promise.all(
          recommendations.map(async (rec: Token) => {
            const mentions = await getTokenMentions(rec.symbol, 5)
            return {
              ...rec,
              socialContext: {
                mentions: mentions.length,
                reactions: mentions.reduce((sum: number, cast: { reactions: { likes: number; recasts: number } }) => 
                  sum + cast.reactions.likes + cast.reactions.recasts, 0
                )
              }
            }
          })
        )
        recommendations = enhancedRecommendations
      } catch (error) {
        logger.error('Failed to enhance recommendations with Farcaster data:', error)
      }
    }

    return {
      response: data.message || data.response || '',
      recommendations,
      actions: data.actions || []
    }
  } catch (error) {
    logger.error('Agent error:', error)
    return {
      response: 'An error occurred while processing your request.',
      recommendations: [fallbackToken],
      actions: []
    }
  }
}

function parseRecommendations(content: string): any[] {
  try {
    const recommendations: any[] = [];
    const lines = content.split('\n');
    
    let currentToken: any = null;
    let description = '';
    
    for (const line of lines) {
      // Match token line: "1. TokenName ($SYMBOL):"
      const tokenMatch = line.match(/^\d+\.\s+([^(]+)\s+\((\$[^)]+)\):/);
      if (tokenMatch) {
        // Save previous token if exists
        if (currentToken) {
          currentToken.description = description.trim();
          recommendations.push(currentToken);
          description = '';
        }
        
        const [, name, symbol] = tokenMatch;
        currentToken = {
          name: name.trim(),
          symbol: symbol?.replace('$', '').trim(),
          description: '',
          imageUrl: `https://placehold.co/1200x630/png?text=${symbol?.replace('$', '') || name}`,
          price: 'Market Price',
          category: 'art'
        };
      } else if (currentToken && line.trim()) {
        description += ' ' + line.trim();
      }
    }
    
    // Add the last token
    if (currentToken) {
      currentToken.description = description.trim();
      recommendations.push(currentToken);
    }

    return recommendations;
  } catch (error) {
    console.error('[ERROR] Failed to parse recommendations:', error);
    return [];
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
          const analyzedToken = await analyzeToken(token.id.toString())
          recommendations.push(analyzedToken)
        } catch (error) {
          logger.error('Error analyzing token:', { error, tokenId: token.id })
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