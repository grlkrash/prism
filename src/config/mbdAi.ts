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
      if (!apiKey) {
        console.error('[MBD AI] API key not found in environment variables')
        throw new Error('MBD API key not found')
      }
      headers['Authorization'] = `Bearer ${apiKey}`
    }
    
    return headers
  },

  // Client-side API endpoints (through proxy)
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
    USERS_SIMILAR: '/v2/users/similar'
  },

  // Rate Limiting
  RATE_LIMIT: {
    MAX_REQUESTS: 100,
    WINDOW_MS: 60 * 1000
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
  },

  // Add validation function for endpoints
  validateEndpoint: (endpoint: string): string => {
    if (!endpoint) throw new Error('Endpoint is required')
    return endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  },

  // Enhanced logging function
  logConfig: () => {
    if (typeof window === 'undefined') {
      // Server-side logging
      console.log('=== MBD AI Server Configuration ===')
      console.log('API Key exists:', !!process.env.MBD_API_KEY)
      console.log('API URL:', process.env.MBD_AI_API_URL)
    } else {
      // Client-side logging
      console.log('=== MBD AI Client Configuration ===')
      console.log('Using proxy endpoints')
      console.log('API URL (proxy):', '/api/mbd')
    }
  }
}

// Export validation function
export const isConfigValid = () => {
  if (typeof window === 'undefined') {
    return !!process.env.MBD_API_KEY && !!process.env.MBD_AI_API_URL
  }
  return true // Client-side is always valid since it uses proxy
}

// Log configuration in development
if (process.env.NODE_ENV === 'development') {
  MBD_AI_CONFIG.logConfig()
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