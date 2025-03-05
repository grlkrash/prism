import { NextRequest } from 'next/server'

export interface Token {
  id: number
  name: string
  description: string
  imageUrl: string
  artistName: string
  price: string
  social?: {
    twitter?: string
    discord?: string
    website?: string
  }
  metadata?: {
    category?: string
    tags?: string[]
    sentiment?: number
    popularity?: number
    aiScore?: number
  }
}

export const tokenDatabase: Token[] = [
  {
    id: 1,
    name: "Digital Dreams #1",
    description: "A mesmerizing piece of digital art",
    imageUrl: "https://picsum.photos/800/600",
    artistName: "AI Artist",
    price: "0.1 ETH",
    social: {
      twitter: 'twitter.com/digitalrenaissance',
      discord: 'discord.gg/digitalrenaissance',
      website: 'digitalrenaissance.art'
    }
  },
  {
    id: 2,
    name: "Sound Wave #1",
    description: "A symphony of digital sound",
    imageUrl: "https://picsum.photos/800/601",
    artistName: "Sound Artist",
    price: "0.1 ETH",
    social: {
      twitter: 'twitter.com/soundwave',
      discord: 'discord.gg/soundwave',
      website: 'soundwavetoken.xyz'
    }
  },
  {
    id: 3,
    name: "Urban Canvas #1",
    description: "Street art meets digital world",
    imageUrl: "https://picsum.photos/800/602",
    artistName: "Urban Artist",
    price: "0.1 ETH",
    social: {
      twitter: 'twitter.com/urbancanvas',
      discord: 'discord.gg/urbancanvas',
      website: 'urbancanvas.art'
    }
  }
]

export async function validateFrameRequest(req: NextRequest) {
  try {
    const body = await req.json()
    // For now, we'll just validate the basic structure
    const isValid = body && typeof body === 'object' && 'untrustedData' in body
    return {
      isValid,
      message: isValid ? {
        button: body.untrustedData?.buttonIndex || 0,
        inputText: body.untrustedData?.text || '',
        fid: body.untrustedData?.fid
      } : null
    }
  } catch (error) {
    console.error('Error validating frame request:', error)
    return { isValid: false, message: null }
  }
}

export const frameActions = {
  close: async () => {
    // Implement close action
  },
  openUrl: async (url: string) => {
    // Implement open URL action
  }
}

export async function analyzeToken(token: Token) {
  try {
    const response = await fetch('https://api.mbd.ai/v1/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_MBD_AI_API_KEY}`
      },
      body: JSON.stringify({
        token: {
          name: token.name,
          description: token.description,
          imageUrl: token.imageUrl,
          social: token.social
        }
      })
    })

    if (!response.ok) throw new Error('Failed to analyze token')
    
    const analysis = await response.json()
    return {
      ...token,
      metadata: {
        ...token.metadata,
        category: analysis.category,
        tags: analysis.tags,
        sentiment: analysis.sentiment,
        popularity: analysis.popularity,
        aiScore: analysis.aiScore
      }
    }
  } catch (error) {
    console.error('Error analyzing token:', error)
    return token
  }
}

export async function getPersonalizedFeed(userId: string, preferences?: {
  categories?: string[]
  minSentiment?: number
  minPopularity?: number
}) {
  try {
    const response = await fetch('https://api.mbd.ai/v1/recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_MBD_AI_API_KEY}`
      },
      body: JSON.stringify({
        userId,
        preferences: {
          categories: preferences?.categories || [],
          minSentiment: preferences?.minSentiment || 0,
          minPopularity: preferences?.minPopularity || 0
        }
      })
    })

    if (!response.ok) throw new Error('Failed to get personalized feed')
    
    const recommendations = await response.json()
    return recommendations.tokens
  } catch (error) {
    console.error('Error getting personalized feed:', error)
    return tokenDatabase // Fallback to all tokens
  }
}

export async function analyzeImage(imageUrl: string) {
  try {
    const response = await fetch('https://api.mbd.ai/v1/vision/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_MBD_AI_API_KEY}`
      },
      body: JSON.stringify({ imageUrl })
    })

    if (!response.ok) throw new Error('Failed to analyze image')
    
    return await response.json()
  } catch (error) {
    console.error('Error analyzing image:', error)
    return null
  }
} 