import { z } from 'zod'
import { AGENTKIT_CONFIG, AgentRequest, AgentResponse, agentRequestSchema, agentResponseSchema } from '@/config/agentkit'

class AgentkitError extends Error {
  constructor(message: string, public status?: number, public code?: string) {
    super(message)
    this.name = 'AgentkitError'
  }
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  requests: new Map<string, number[]>()
}

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userRequests = RATE_LIMIT.requests.get(userId) || []
  
  // Remove old requests
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT.windowMs)
  
  if (recentRequests.length >= RATE_LIMIT.maxRequests) {
    return false
  }
  
  recentRequests.push(now)
  RATE_LIMIT.requests.set(userId, recentRequests)
  return true
}

export async function sendMessage(request: unknown): Promise<AgentResponse> {
  try {
    // Validate request
    const { message, userId, context } = z.object({
      message: z.string(),
      userId: z.string().optional(),
      context: z.record(z.any()).optional()
    }).parse(request)

    // Check rate limit
    if (userId && !checkRateLimit(userId)) {
      throw new RateLimitError('Rate limit exceeded')
    }

    // Call OpenAI API directly
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, userId, context })
    })

    if (!response.ok) {
      throw new Error('Failed to get response from agent')
    }

    const result = await response.json()
    return agentResponseSchema.parse(result)

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AgentkitError('Invalid request format', 400)
    }
    if (error instanceof RateLimitError) {
      throw new AgentkitError('Rate limit exceeded', 429)
    }
    throw new AgentkitError(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
}

interface TokenRecommendation {
  id: string
  name: string
  symbol: string
  description: string
  imageUrl: string
  price: string
  culturalScore: number
  tokenType: 'ERC20'
}

function extractTokenRecommendations(content: unknown): TokenRecommendation[] {
  try {
    if (!content) return []
    
    // Ensure content is a string
    const contentStr = typeof content === 'object' 
      ? JSON.stringify(content)
      : String(content)
    
    // Try parsing as JSON first
    try {
      const parsed = JSON.parse(contentStr)
      if (Array.isArray(parsed?.recommendations)) {
        return parsed.recommendations.map((rec: any) => ({
          id: crypto.randomUUID(),
          name: rec.name || 'Unknown Token',
          symbol: rec.symbol || 'UNKNOWN',
          description: rec.description || '',
          imageUrl: rec.imageUrl || '',
          price: rec.price || '0',
          culturalScore: rec.culturalScore || Math.floor(Math.random() * 100),
          tokenType: 'ERC20'
        }))
      }
    } catch {}
    
    // Try extracting from text format
    const recommendationsMatch = contentStr.match(/Token Recommendations:([\s\S]*?)(?=Actions:|$)/)
    if (!recommendationsMatch) return []
    
    const recommendations = recommendationsMatch[1]
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const match = line.match(/\d+\.\s+([^($]+)\s+\((\$[^)]+)\):\s+(.+)/)
        if (!match) return null
        
        const [_, name, symbol, description] = match
        return {
          id: crypto.randomUUID(),
          name: name.trim(),
          symbol: symbol.replace('$', '').trim(),
          description: description.trim(),
          imageUrl: '',
          price: '0',
          culturalScore: Math.floor(Math.random() * 100),
          tokenType: 'ERC20' as const
        }
      })
      .filter((rec): rec is TokenRecommendation => rec !== null)
    
    return recommendations
  } catch (error) {
    console.error('Error extracting recommendations:', error)
    return []
  }
}

function extractActions(content: unknown): { type: string, tokenId: string, label: string }[] {
  try {
    if (!content) return []
    
    const contentStr = typeof content === 'object' 
      ? JSON.stringify(content)
      : String(content)
    
    const actionsMatch = contentStr.match(/Actions:([\s\S]*?)$/)
    if (!actionsMatch) return []
    
    return actionsMatch[1]
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [type, tokenId, label] = line.split('|')
        return { type, tokenId, label }
      })
      .filter(action => action.type && action.tokenId && action.label)
  } catch (error) {
    console.error('Error extracting actions:', error)
    return []
  }
}

export async function getTokenRecommendations(userId: string, preferences?: {
  interests?: string[]
  priceRange?: { min?: number; max?: number }
}): Promise<z.infer<typeof agentResponseSchema>> {
  // Ensure priceRange has both min and max values
  const normalizedPreferences = preferences ? {
    ...preferences,
    priceRange: preferences.priceRange ? {
      min: preferences.priceRange.min || 0,
      max: preferences.priceRange.max || 1000
    } : undefined
  } : undefined;

  return sendMessage({
    message: 'Please recommend some cultural tokens based on my preferences and Farcaster trends.',
    userId,
    context: {
      userPreferences: normalizedPreferences
    }
  })
}

export async function analyzeTokenWithAgent(tokenId: string, userId: string): Promise<z.infer<typeof agentResponseSchema>> {
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