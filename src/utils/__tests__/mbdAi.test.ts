import { analyzeToken, getPersonalizedFeed, calculateCulturalScore } from '../mbdAi'
import { tokenDatabase } from '../mbdAi'
import { 
  getTrendingFeed, 
  searchCasts, 
  getLabelsForCasts, 
  getSimilarUsers,
  validateFrameRequest
} from '../mbdAi'
import { NextRequest } from 'next/server'
import { jest } from '@jest/globals'

// Mock fetch
global.fetch = jest.fn(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({
    casts: [
      {
        author: {
          fid: 1,
          username: 'test',
        },
        text: 'Test cast',
        timestamp: '2024-03-20T12:00:00Z',
        aiAnalysis: {
          culturalScore: 0.8,
          hasCulturalElements: true,
          category: 'art',
          tags: ['digital', 'creative'],
          sentiment: 'positive',
          popularity: 0.7,
          aiScore: 0.85,
          isCulturalToken: true
        }
      }
    ],
    next: {
      cursor: 'cursor_123'
    }
  })
}))

// Mock logger
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}))

// Test Constants
const TEST_USER_ID = 'test_user_123'
const TEST_CURSOR = 'test_cursor_456'

describe('MBD AI Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

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
    it('should return personalized feed data', async () => {
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
          next: {
            cursor: 'cursor_123'
          }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await getPersonalizedFeed('user123')
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500
      })

      const result = await getPersonalizedFeed('user123')
      expect(result).toEqual({ casts: [], next: undefined })
    })

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

  describe('getTrendingFeed', () => {
    it('should return trending feed data', async () => {
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
            cursor: 'cursor_123'
          }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await getTrendingFeed()
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('searchCasts', () => {
    it('should return search results', async () => {
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
            cursor: 'cursor_123'
          }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await searchCasts('test query')
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('getLabelsForCasts', () => {
    it('should return labels for casts', async () => {
      const mockResponse = {
        data: {
          labels: [
            {
              hash: '0x123',
              labels: ['art', 'culture']
            }
          ]
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await getLabelsForCasts(['0x123'])
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('getSimilarUsers', () => {
    it('should return similar users', async () => {
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
            cursor: 'cursor_123'
          }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await getSimilarUsers('user123')
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('validateFrameRequest', () => {
    it('should validate valid frame request', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/frame', {
        method: 'POST',
        body: JSON.stringify({
          untrustedData: {
            buttonIndex: 1,
            inputText: 'test'
          },
          trustedData: {
            messageBytes: 'test'
          }
        })
      })

      const result = await validateFrameRequest(mockRequest)
      expect(result.isValid).toBe(true)
      expect(result.message).toEqual({
        button: 1,
        inputText: 'test'
      })
    })

    it('should handle invalid frame request', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/frame', {
        method: 'POST',
        body: JSON.stringify({
          untrustedData: {},
          trustedData: {}
        })
      })

      const result = await validateFrameRequest(mockRequest)
      expect(result.isValid).toBe(false)
      expect(result.message).toBeNull()
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