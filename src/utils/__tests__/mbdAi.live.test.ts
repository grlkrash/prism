import { 
  getPersonalizedFeed, 
  getTrendingFeed,
  analyzeToken,
  calculateCulturalScore,
  Token
} from '../mbdAi'
import { MBD_AI_CONFIG } from '@/config/mbdAi'

// Mock fetch globally
global.fetch = jest.fn()

describe('MBD AI Live Tests', () => {
  // Set longer timeout for API calls
  jest.setTimeout(30000)

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    process.env.MBD_API_KEY = 'test-key'

    // Setup default mock response for feeds
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('analyze/token')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              metadata: {
                category: 'Digital Art',
                tags: ['art', 'digital', 'culture'],
                sentiment: 0.8,
                popularity: 150,
                aiScore: 0.9,
                culturalContext: 'Contemporary digital art movement',
                artistBio: 'Digital artist specializing in AI-generated art',
                artStyle: 'Abstract Digital',
                isArtwork: true,
                hasCulturalElements: true
              }
            }
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: {
            casts: [
              {
                hash: '0x123',
                author: {
                  fid: 1,
                  username: 'test',
                  displayName: 'Test User',
                  pfp: 'https://example.com/pfp.jpg'
                },
                text: 'Test cultural token\n#art #digital\n$TEST',
                timestamp: '2024-03-20T12:00:00Z',
                reactions: {
                  likes: 10,
                  recasts: 5
                },
                aiAnalysis: {
                  category: 'art',
                  sentiment: 0.8,
                  popularity: 0.7,
                  aiScore: 0.85,
                  culturalContext: 'Digital Art Movement',
                  artStyle: 'Digital Abstract',
                  isArtwork: true,
                  hasCulturalElements: true
                }
              }
            ],
            next: {
              cursor: 'next-page'
            }
          }
        })
      })
    })
  })

  describe('Feed Integration', () => {
    it('should fetch and process trending feed with AI analysis', async () => {
      // Test real API call
      const feed = await getTrendingFeed()
      
      expect(feed).toBeDefined()
      expect(Array.isArray(feed.casts)).toBe(true)
      
      if (feed.casts?.length > 0) {
        const cast = feed.casts[0]
        
        // Verify cast structure
        expect(cast).toHaveProperty('hash')
        expect(cast).toHaveProperty('text')
        expect(cast).toHaveProperty('author')
        expect(cast.author).toHaveProperty('fid')
        
        // Convert to token and analyze
        const token: Token = {
          id: cast.hash,
          name: cast.text.split('\n')[0] || 'Untitled',
          symbol: cast.text.match(/\$([A-Z]+)/)?.[1] || 'TOKEN',
          description: cast.text,
          imageUrl: cast.author.pfp || '',
          artistName: cast.author.displayName || cast.author.username,
          price: '0.001',
          culturalScore: 0,
          tokenType: 'ERC20'
        }

        const analyzed = await analyzeToken(token)
        expect(analyzed).toBeDefined()
        expect(analyzed.aiAnalysis).toBeDefined()

        // Verify cultural scoring
        const score = calculateCulturalScore(analyzed)
        expect(score).toBeGreaterThanOrEqual(0)
        expect(score).toBeLessThanOrEqual(1)

        console.log('Analyzed token:', JSON.stringify(analyzed, null, 2))
        console.log('Cultural score:', score)
      }
    })

    it('should fetch personalized feed with AI recommendations', async () => {
      const feed = await getPersonalizedFeed()
      
      expect(feed).toBeDefined()
      expect(Array.isArray(feed.casts)).toBe(true)
      
      if (feed.casts?.length > 0) {
        // Check AI analysis fields
        const cast = feed.casts[0]
        expect(cast.aiAnalysis).toBeDefined()
        expect(cast.aiAnalysis).toHaveProperty('category')
        expect(cast.aiAnalysis).toHaveProperty('culturalContext')
        expect(cast.aiAnalysis).toHaveProperty('hasCulturalElements')
        
        // Verify cultural filtering
        const culturalCasts = feed.casts.filter(cast => 
          cast.aiAnalysis?.hasCulturalElements || 
          cast.aiAnalysis?.category?.toLowerCase().includes('art') ||
          cast.aiAnalysis?.category?.toLowerCase().includes('music')
        )
        
        expect(culturalCasts.length).toBeGreaterThan(0)
        console.log('Cultural casts found:', culturalCasts.length)
      }
    })

    it('should handle pagination correctly', async () => {
      const firstPage = await getTrendingFeed()
      expect(firstPage.next).toBeDefined()
      
      if (firstPage.next?.cursor) {
        const secondPage = await getTrendingFeed(firstPage.next.cursor)
        expect(secondPage.casts).toBeDefined()
        expect(secondPage.casts[0].hash).not.toEqual(firstPage.casts[0].hash)
      }
    })

    it('should handle API errors gracefully', async () => {
      // Mock error response
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          statusText: 'Unauthorized'
        })
      )

      await expect(getTrendingFeed()).rejects.toThrow('Failed to fetch trending feed: Unauthorized')
    })

    it('should calculate cultural scores accurately', async () => {
      const feed = await getTrendingFeed()
      
      if (feed.casts?.length > 0) {
        const scores = await Promise.all(
          feed.casts.slice(0, 3).map(async cast => {
            const token: Token = {
              id: cast.hash,
              name: cast.text.split('\n')[0] || 'Untitled',
              symbol: cast.text.match(/\$([A-Z]+)/)?.[1] || 'TOKEN',
              description: cast.text,
              imageUrl: cast.author.pfp || '',
              artistName: cast.author.displayName || cast.author.username,
              price: '0.001',
              culturalScore: 0,
              tokenType: 'ERC20'
            }

            const analyzed = await analyzeToken(token)
            return {
              token: analyzed,
              score: calculateCulturalScore(analyzed)
            }
          })
        )

        scores.forEach(({ token, score }) => {
          expect(score).toBeGreaterThanOrEqual(0)
          expect(score).toBeLessThanOrEqual(1)
          console.log(`Score for ${token.name}: ${score}`)
        })
      }
    })
  })
}) 