import { farcasterRequest } from './farcaster'
import { logger } from './logger'
import { Cast, analyzeToken } from './mbdAi'
import { MBD_AI_CONFIG } from '@/config/mbdAi'

interface FeedResponse {
  casts: Cast[]
  next?: {
    cursor: string
  }
}

export async function getPersonalizedFeed(fid: string, cursor?: string): Promise<FeedResponse> {
  try {
    const endpoint = `/feed?fid=${fid}&limit=20${cursor ? `&cursor=${cursor}` : ''}`
    const response = await farcasterRequest(endpoint)

    if (!response || !response.casts) {
      logger.error('Invalid feed response:', response)
      return { casts: [] }
    }

    // Filter and analyze cultural content
    const culturalCasts = await Promise.all(
      response.casts.map(async (cast: Cast) => {
        try {
          // Skip if already analyzed
          if (cast.aiAnalysis) return cast

          // Analyze cast for cultural elements
          const analysis = await analyzeToken(cast)
          
          return {
            ...cast,
            aiAnalysis: {
              category: analysis?.category || 'unknown',
              sentiment: analysis?.sentiment || 0,
              popularity: analysis?.popularity || 0,
              aiScore: analysis?.aiScore || 0,
              culturalContext: analysis?.culturalContext || '',
              hasCulturalElements: 
                analysis?.category?.toLowerCase().includes('art') ||
                analysis?.category?.toLowerCase().includes('culture') ||
                (analysis?.aiScore || 0) >= MBD_AI_CONFIG.CULTURAL_TOKEN.MIN_CONTENT_SCORE
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
    logger.error('Error fetching personalized feed:', error)
    return { casts: [] }
  }
} 