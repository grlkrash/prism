import { farcasterRequest } from './farcaster'
import { logger } from './logger'
import { Cast, analyzeToken, type Token } from './mbdAi'
import { MBD_AI_CONFIG } from '@/config/mbdAi'
import { sendMessage } from './agentkit'
import { getAgent } from '@/config/agentkit'

interface FeedResponse {
  casts: Cast[]
  next?: {
    cursor: string
  }
}

export async function getPersonalizedFeed(fid: string, cursor?: string): Promise<FeedResponse> {
  try {
    // 1. Try AI Agent first
    try {
      const agent = await getAgent()
      const agentResponse = await sendMessage({
        message: 'Get personalized cultural token feed',
        userId: fid,
        context: {
          cursor,
          preferences: {
            interests: ['art', 'culture', 'music'],
            filters: {
              minScore: MBD_AI_CONFIG.CULTURAL_TOKEN.MIN_CONTENT_SCORE,
              categories: MBD_AI_CONFIG.CULTURAL_TOKEN.INDICATORS.CONTENT
            }
          }
        }
      })

      // Safely check recommendations existence and length
      const recommendations = agentResponse?.recommendations
      if (recommendations && recommendations.length > 0) {
        // Convert agent recommendations to casts
        const casts: Cast[] = recommendations.map(rec => ({
          hash: rec.symbol.toLowerCase(),
          threadHash: '',
          author: {
            fid: parseInt(fid),
            username: rec.name,
            displayName: rec.name,
            pfp: ''
          },
          text: rec.description,
          timestamp: Date.now().toString(),
          reactions: { likes: 0, recasts: 0 },
          aiAnalysis: {
            category: rec.category || 'art',
            sentiment: 1, // Default sentiment
            popularity: 1, // Default popularity
            aiScore: rec.culturalScore || 0.8,
            culturalContext: rec.description || 'Cultural token',
            artStyle: rec.tags?.[0],
            isArtwork: true,
            hasCulturalElements: true
          }
        }))

        return {
          casts,
          next: cursor ? { cursor } : undefined
        }
      }
    } catch (agentError) {
      logger.warn('AI Agent feed failed, falling back to MBD AI:', agentError)
    }

    // 2. Try MBD AI as fallback
    const endpoint = `/feed?fid=${fid}&limit=20${cursor ? `&cursor=${cursor}` : ''}`
    const response = await farcasterRequest(endpoint)

    if (!response || !response.casts) {
      logger.error('Invalid MBD AI feed response:', response)
      throw new Error('Invalid feed response')
    }

    // Filter and analyze cultural content
    const culturalCasts = await Promise.all(
      response.casts.map(async (cast: Cast) => {
        try {
          // Skip if already analyzed
          if (cast.aiAnalysis) return cast

          // Analyze token using its hash as ID
          const analysis = await analyzeToken(cast.hash)
          
          return {
            ...cast,
            aiAnalysis: {
              category: analysis.metadata?.category || 'unknown',
              sentiment: analysis.metadata?.sentiment || 0,
              popularity: analysis.metadata?.popularity || 0,
              aiScore: analysis.culturalScore || 0,
              culturalContext: analysis.metadata?.culturalContext || '',
              hasCulturalElements: 
                analysis.metadata?.category?.toLowerCase().includes('art') ||
                analysis.metadata?.category?.toLowerCase().includes('culture') ||
                (analysis.culturalScore || 0) >= MBD_AI_CONFIG.CULTURAL_TOKEN.MIN_CONTENT_SCORE
            }
          }
        } catch (error) {
          logger.error('Error analyzing cast:', error)
          return cast
        }
      })
    )

    // Filter out non-cultural content
    const filteredCasts = culturalCasts.filter(cast => 
      cast.aiAnalysis?.hasCulturalElements ||
      cast.aiAnalysis?.category?.toLowerCase().includes('art') ||
      cast.aiAnalysis?.category?.toLowerCase().includes('culture') ||
      (cast.aiAnalysis?.aiScore || 0) >= MBD_AI_CONFIG.CULTURAL_TOKEN.MIN_CONTENT_SCORE
    )

    return {
      casts: filteredCasts,
      next: response.next
    }
  } catch (error) {
    logger.error('Error fetching feed, using mock data:', error)
    
    // 3. Use mock data as final fallback
    return {
      casts: [{
        hash: 'mock1',
        threadHash: '',
        author: {
          fid: 1,
          username: 'mockartist',
          displayName: 'Mock Artist',
          pfp: ''
        },
        text: 'Mock cultural token #1',
        timestamp: Date.now().toString(),
        reactions: { likes: 0, recasts: 0 },
        aiAnalysis: {
          category: 'art',
          sentiment: 1,
          popularity: 1,
          aiScore: 0.8,
          culturalContext: 'Mock cultural context',
          hasCulturalElements: true
        }
      }]
    }
  }
} 