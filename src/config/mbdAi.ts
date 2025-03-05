export const MBD_AI_CONFIG = {
  // API Configuration
  API_URL: process.env.MBD_AI_API_URL || 'https://api.mbd.xyz/v2',
  WARPCAST_API_URL: process.env.NEXT_PUBLIC_FARCASTER_API_URL || 'https://api.warpcast.com',
  
  // Headers Configuration
  getHeaders: () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
    
    // Check if we're on the server side
    if (typeof window === 'undefined') {
      const apiKey = process.env.MBD_API_KEY
      if (!apiKey?.startsWith('mbd-')) {
        throw new Error('Invalid MBD API key format. Key should start with "mbd-"')
      }
      headers['Authorization'] = `Bearer ${apiKey}`
    }
    
    return headers
  },

  // Client-side API endpoints
  CLIENT_ENDPOINTS: {
    TRENDING_FEED: '/api/mbd?endpoint=/v2/discover-actions',
    FOR_YOU_FEED: '/api/mbd?endpoint=/v2/feed',
    SEARCH: '/api/mbd?endpoint=/v2/search',
    LABELS: '/api/mbd?endpoint=/v2/labels'
  },

  // Server-side API endpoints
  SERVER_ENDPOINTS: {
    FEED_FOR_YOU: '/v2/feed',
    FEED_TRENDING: '/v2/discover-actions',
    SEARCH_SEMANTIC: '/v2/search',
    LABELS_FOR_ITEMS: '/v2/labels',
    USERS_SIMILAR: '/v2/users/similar',
    CHANNEL_FOLLOWS: '/fc/channel-follows',
    BLOCKED_USERS: '/fc/blocked-users',
    ACCOUNT_VERIFICATIONS: '/fc/account-verifications'
  },

  // Rate Limiting
  RATE_LIMIT: {
    MAX_REQUESTS: 100,
    WINDOW_MS: 60 * 1000, // 1 minute
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

// Validate configuration only on server side
const validateConfig = () => {
  if (typeof window !== 'undefined') {
    return true // Skip validation on client side
  }
  
  const apiKey = process.env.MBD_API_KEY
  if (!apiKey?.startsWith('mbd-')) {
    console.error('[MBD AI] Invalid API key format. Key should start with "mbd-"')
    return false
  }
  return true
}

// Export validation function
export const isConfigValid = validateConfig()

// Validate configuration in development only
if (process.env.NODE_ENV === 'development') {
  console.log('=== MBD AI Configuration Debug ===')
  console.log('1. Environment Check:')
  console.log('- process.env exists:', !!process.env)
  console.log('- Available MBD keys:', Object.keys(process.env).filter(key => key.includes('MBD')))
  
  console.log('\n2. Configuration Check:')
  console.log('- API Key exists:', !!process.env.MBD_API_KEY)
  console.log('- API Key format:', typeof process.env.MBD_API_KEY === 'string' && process.env.MBD_API_KEY.startsWith('mbd-'))
  console.log('- API_URL:', MBD_AI_CONFIG.API_URL)

  if (!process.env.MBD_API_KEY) {
    console.warn('\n❌ Configuration Error:')
    console.warn('- MBD AI API key not found')
    console.warn('- Set MBD_API_KEY in .env.local')
    console.warn('- Format: mbd-xxxxxxxxxxxx')
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
export const isTestMode = process.env.NODE_ENV === 'test' || process.env.MBD_API_KEY === 'test-key-for-development'

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