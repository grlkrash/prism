import { 
  getPersonalizedFeed, 
  getTrendingFeed, 
  searchCasts, 
  getLabelsForCasts, 
  getSimilarUsers,
  analyzeToken,
  tokenDatabase
} from '../mbdAi'
import { logger } from '../logger'

// Mock fetch
global.fetch = jest.fn()

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  }
}))

describe('MBD AI Integration Tests', () => {
  const TEST_USER_ID = 'test-user-123'
  const TEST_CURSOR = 'test-cursor-123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Feed Integration', () => {
    it('should fetch personalized feed with pagination', async () => {
      const mockResponse = {
        data: {
          casts: [
            {
              hash: '0x123',
              author: {
                fid: 1,
                username: 'test'
              },
              text: 'Test cast',
              timestamp: '2024-03-20T12:00:00Z',
              reactions: {
                likes: 10,
                recasts: 5
              }
            }
          ],
          next: { cursor: 'next-page' }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const result = await getPersonalizedFeed()
      expect(result).toEqual(mockResponse.data)
    })

    it('should fetch and filter cultural tokens from trending feed', async () => {
      const mockCasts = [
        {
          hash: '0x123',
          author: { fid: 1, username: 'artist1' },
          text: 'Cultural NFT #1',
          timestamp: '2024-03-20T12:00:00Z',
          reactions: { likes: 10, recasts: 5 },
          aiAnalysis: {
            category: 'art',
            sentiment: 0.8,
            popularity: 0.7,
            aiScore: 0.9,
            culturalContext: 'Contemporary Art',
            hasCulturalElements: true
          }
        },
        {
          hash: '0x456',
          author: { fid: 2, username: 'user2' },
          text: 'Regular post',
          timestamp: '2024-03-20T12:00:00Z',
          reactions: { likes: 5, recasts: 2 },
          aiAnalysis: {
            category: 'general',
            sentiment: 0.5,
            popularity: 0.3,
            aiScore: 0.4,
            hasCulturalElements: false
          }
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { casts: mockCasts } })
      })

      const result = await getTrendingFeed()
      expect(result.casts).toHaveLength(2)
      expect(result.casts[0].aiAnalysis.hasCulturalElements).toBe(true)
      expect(result.casts[0].aiAnalysis.category).toBe('art')
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))
      
      await expect(getTrendingFeed()).rejects.toThrow('API Error')
      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle pagination correctly', async () => {
      const mockFirstPage = {
        data: {
          casts: [{ hash: '0x123' }],
          next: { cursor: 'page2' }
        }
      }

      const mockSecondPage = {
        data: {
          casts: [{ hash: '0x456' }],
          next: null
        }
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
      expect(result).toEqual(mockResponse.data)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/casts/feed/for-you'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(TEST_USER_ID)
        })
      )
    })

    it('should fetch trending feed with pagination', async () => {
      const mockResponse = {
        data: {
          casts: [
            {
              hash: '0x123',
              author: {
                fid: 1,
                username: 'test'
              },
              text: 'Trending cast',
              timestamp: '2024-03-20T12:00:00Z',
              reactions: {
                likes: 100,
                recasts: 50
              }
            }
          ],
          next: {
            cursor: 'next-cursor'
          }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await getTrendingFeed(TEST_CURSOR)
      
      expect(result).toEqual(mockResponse.data)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/casts/feed/trending'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(TEST_CURSOR)
        })
      )
    })
  })

  describe('Search Integration', () => {
    it('should search casts with semantic query', async () => {
      const mockResponse = {
        data: {
          casts: [
            {
              hash: '0x123',
              author: {
                fid: 1,
                username: 'test'
              },
              text: 'Search result',
              timestamp: '2024-03-20T12:00:00Z',
              reactions: {
                likes: 10,
                recasts: 5
              }
            }
          ],
          next: {
            cursor: 'next-cursor'
          }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await searchCasts('digital art', TEST_CURSOR)
      
      expect(result).toEqual(mockResponse.data)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/casts/search/semantic'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('digital art')
        })
      )
    })
  })

  describe('Labels Integration', () => {
    it('should fetch labels for multiple casts', async () => {
      const mockResponse = {
        data: {
          labels: [
            {
              hash: '0x123',
              labels: ['art', 'digital', 'culture']
            },
            {
              hash: '0x456',
              labels: ['music', 'sound', 'creative']
            }
          ]
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await getLabelsForCasts(['0x123', '0x456'])
      
      expect(result).toEqual(mockResponse.data)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/casts/labels/for-items'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('0x123')
        })
      )
    })
  })

  describe('User Integration', () => {
    it('should fetch similar users with pagination', async () => {
      const mockResponse = {
        data: {
          users: [
            {
              fid: 2,
              username: 'similar_user',
              displayName: 'Similar User',
              pfp: 'https://picsum.photos/200'
            }
          ],
          next: {
            cursor: 'next-cursor'
          }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await getSimilarUsers(TEST_USER_ID, TEST_CURSOR)
      
      expect(result).toEqual(mockResponse.data)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/feed/similar'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(TEST_USER_ID)
        })
      )
    })
  })

  describe('Token Analysis Integration', () => {
    it('should analyze token with content and image analysis', async () => {
      const mockContentResponse = {
        data: {
          category: 'Digital Art',
          tags: ['art', 'digital', 'culture'],
          sentiment: 0.8,
          popularity: 150,
          aiScore: 0.9,
          culturalContext: 'Contemporary digital art movement',
          artistBio: 'Digital artist specializing in AI-generated art'
        }
      }

      const mockImageResponse = {
        data: {
          artStyle: 'Abstract Digital',
          isArtwork: true,
          hasCulturalElements: true,
          hasAudioElements: false,
          hasMediaElements: true
        }
      }

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockContentResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockImageResponse)
        })

      const token = tokenDatabase[0]
      const result = await analyzeToken(token, TEST_USER_ID)
      
      expect(result.metadata).toBeDefined()
      expect(result.metadata?.category).toBe('Digital Art')
      expect(result.metadata?.isCulturalToken).toBe(true)
      expect(result.metadata?.artStyle).toBe('Abstract Digital')
      
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/analyze'),
        expect.any(Object)
      )
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/vision/analyze'),
        expect.any(Object)
      )
    })
  })

  describe('Rate Limiting Integration', () => {
    it('should handle rate limit errors gracefully', async () => {
      const mockErrorResponse = {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded. Please try again later.'
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve(mockErrorResponse)
      })

      await expect(getPersonalizedFeed(TEST_USER_ID)).rejects.toThrow('Rate limit exceeded')
      expect(logger.warn).toHaveBeenCalledWith(
        'Rate limit exceeded',
        expect.any(Object),
        TEST_USER_ID
      )
    })
  })
}) 