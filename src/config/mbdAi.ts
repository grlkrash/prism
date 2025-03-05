export const MBD_AI_CONFIG = {
  // API Configuration
  API_URL: process.env.NEXT_PUBLIC_MBD_AI_API_URL || 'https://api.mbd.xyz/v2',
  API_KEY: process.env.MBD_API_KEY,

  // Rate Limiting
  RATE_LIMIT: {
    MAX_REQUESTS: 100,
    WINDOW_MS: 60 * 1000, // 1 minute
  },

  // Endpoints
  ENDPOINTS: {
    FEED_FOR_YOU: '/farcaster/feed/for-you',
    FEED_TRENDING: '/farcaster/feed/trending',
    SEARCH_SEMANTIC: '/farcaster/search/semantic',
    LABELS_FOR_ITEMS: '/farcaster/labels/for-items',
    USERS_SIMILAR: '/farcaster/users/similar'
  },

  // Cultural Token Detection
  CULTURAL_TOKEN: {
    MIN_CONTENT_SCORE: 0.6,
    MIN_IMAGE_SCORE: 0.6,
    INDICATORS: {
      CONTENT: [
        'art',
        'culture',
        'music',
        'media',
        'artist',
        'creative',
        'sound',
        'audio',
        'entertainment'
      ],
      IMAGE: [
        'artStyle',
        'isArtwork',
        'hasCulturalElements',
        'hasAudioElements',
        'hasMediaElements'
      ]
    }
  },

  // Scoring Weights
  SCORING: {
    CULTURAL_FLAG: 0.4,
    CULTURAL_CONTEXT: 0.2,
    ART_STYLE: 0.2,
    ARTIST_BIO: 0.1,
    RELEVANT_TAGS: 0.1
  },

  // Error Messages
  ERRORS: {
    MISSING_CONFIG: 'Missing MBD AI API key. Please ensure MBD_API_KEY is set in your environment variables.',
    RATE_LIMIT: 'Rate limit exceeded. Please try again later.',
    API_ERROR: 'Failed to communicate with MBD AI API',
    INVALID_RESPONSE: 'Invalid response from MBD AI API'
  }
}

// Validate configuration
if (!MBD_AI_CONFIG.API_KEY) {
  console.warn('Warning: MBD AI API key not found in environment variables')
  console.warn('MBD_API_KEY must be set')
  throw new Error('Missing MBD AI API key configuration')
}

// Export configuration
export default MBD_AI_CONFIG

// Add helper for checking API status
export async function checkApiStatus() {
  try {
    const response = await fetch(`${MBD_AI_CONFIG.API_URL}/health`)
    return response.ok
  } catch (error) {
    console.error('Failed to check MBD AI API status:', error)
    return false
  }
}

// Add test mode flag
export const isTestMode = MBD_AI_CONFIG.API_KEY === 'test-key-for-development'

// Helper function to get mock data for test mode
export function getMockData() {
  return {
    recommendations: [
      {
        id: '1',
        name: 'Test Cultural Token',
        symbol: 'TCT',
        description: 'A test cultural token for development',
        imageUrl: 'https://picsum.photos/800/600',
        artistName: 'Test Artist',
        culturalScore: 85
      }
    ]
  }
} 