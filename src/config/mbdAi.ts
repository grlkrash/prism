export const MBD_AI_CONFIG = {
  // API Configuration
  API_URL: process.env.NEXT_PUBLIC_MBD_AI_API_URL || 'https://api.mbd.xyz/v2',
  WARPCAST_API_URL: process.env.NEXT_PUBLIC_FARCASTER_API_URL || 'https://api.warpcast.com',
  API_KEY: process.env.MBD_API_KEY,
  
  // Headers Configuration
  getHeaders: () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
    
    const apiKey = process.env.MBD_API_KEY
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }
    
    return headers
  },

  // Rate Limiting
  RATE_LIMIT: {
    MAX_REQUESTS: 100,
    WINDOW_MS: 60 * 1000, // 1 minute
  },

  // Endpoints
  ENDPOINTS: {
    FEED_FOR_YOU: '/v2/feed',
    FEED_TRENDING: '/v2/discover-actions',
    SEARCH_SEMANTIC: '/v2/search',
    LABELS_FOR_ITEMS: '/v2/labels',
    USERS_SIMILAR: '/v2/users/similar',
    CHANNEL_FOLLOWS: '/fc/channel-follows',
    BLOCKED_USERS: '/fc/blocked-users',
    ACCOUNT_VERIFICATIONS: '/fc/account-verifications'
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

// Validate configuration in development only
if (process.env.NODE_ENV === 'development') {
  console.log('=== MBD AI Configuration Debug ===')
  console.log('1. Environment Check:')
  console.log('- process.env exists:', !!process.env)
  console.log('- Available MBD keys:', Object.keys(process.env).filter(key => key.includes('MBD')))
  
  console.log('\n2. Configuration Check:')
  console.log('- API_KEY exists:', !!MBD_AI_CONFIG.API_KEY)
  console.log('- API_KEY format:', typeof MBD_AI_CONFIG.API_KEY === 'string' && MBD_AI_CONFIG.API_KEY.startsWith('mbd_'))
  console.log('- API_URL:', MBD_AI_CONFIG.API_URL)

  if (!MBD_AI_CONFIG.API_KEY) {
    console.warn('\n❌ Configuration Error:')
    console.warn('- MBD AI API key not found')
    console.warn('- Set MBD_API_KEY in .env.local')
    console.warn('- Format: mbd_xxxxxxxxxxxx')
  }
}

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
export const isTestMode = process.env.NODE_ENV === 'test' || MBD_AI_CONFIG.API_KEY === 'test-key-for-development'

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