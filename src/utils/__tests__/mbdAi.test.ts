import { analyzeToken, getPersonalizedFeed, calculateCulturalScore } from '../mbdAi'
import { tokenDatabase } from '../mbdAi'

describe('MBD AI Utils', () => {
  describe('analyzeToken', () => {
    it('should analyze a token and return enriched metadata', async () => {
      const token = tokenDatabase[0]
      const result = await analyzeToken(token)
      
      expect(result.metadata).toBeDefined()
      expect(result.metadata?.category).toBeDefined()
      expect(result.metadata?.tags).toBeDefined()
      expect(result.metadata?.sentiment).toBeDefined()
      expect(result.metadata?.popularity).toBeDefined()
      expect(result.metadata?.aiScore).toBeDefined()
      expect(result.metadata?.isCulturalToken).toBeDefined()
      expect(result.metadata?.artStyle).toBeDefined()
      expect(result.metadata?.culturalContext).toBeDefined()
      expect(result.metadata?.artistBio).toBeDefined()
    })
  })

  describe('getPersonalizedFeed', () => {
    it('should return a personalized feed with cultural scores', async () => {
      const feed = await getPersonalizedFeed('test-user')
      
      expect(Array.isArray(feed)).toBe(true)
      expect(feed.length).toBeGreaterThan(0)
      expect(feed[0].culturalScore).toBeDefined()
    })

    it('should respect user preferences', async () => {
      const feed = await getPersonalizedFeed('test-user', {
        categories: ['art'],
        minSentiment: 0.5,
        minPopularity: 100,
        prioritizeCulturalTokens: true
      })
      
      expect(Array.isArray(feed)).toBe(true)
      expect(feed.length).toBeGreaterThan(0)
    })
  })

  describe('calculateCulturalScore', () => {
    it('should calculate correct cultural score', () => {
      const token = {
        ...tokenDatabase[0],
        metadata: {
          isCulturalToken: true,
          culturalContext: 'Digital Art',
          artStyle: 'Abstract',
          artistBio: 'Digital Artist',
          tags: ['art', 'digital', 'culture']
        }
      }
      
      const score = calculateCulturalScore(token)
      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(1)
    })
  })
}) 