export const MBD_AI_CONFIG = {
  // API Configuration
  API_URL: process.env.NEXT_PUBLIC_MBD_AI_API_URL || 'https://api.mbd.xyz/v2/farcaster',
  API_KEY: process.env.NEXT_PUBLIC_MBD_AI_API_KEY,

  // Rate Limiting
  RATE_LIMIT: {
    MAX_REQUESTS: 100,
    WINDOW_MS: 60 * 1000, // 1 minute
  },

  // Endpoints
  ENDPOINTS: {
    FEED_FOR_YOU: '/casts/feed/for-you',
    FEED_TRENDING: '/casts/feed/trending',
    SEARCH_SEMANTIC: '/casts/search/semantic',
    LABELS_FOR_ITEMS: '/casts/labels/for-items',
    USERS_SIMILAR: '/users/feed/similar'
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
    MISSING_CONFIG: 'Missing MBD AI API key. Please ensure NEXT_PUBLIC_MBD_AI_API_KEY is set in your environment variables.',
    RATE_LIMIT: 'Rate limit exceeded. Please try again later.',
    API_ERROR: 'Failed to communicate with MBD AI API',
    INVALID_RESPONSE: 'Invalid response from MBD AI API'
  }
}

// Validate configuration with better error handling
if (!MBD_AI_CONFIG.API_KEY) {
  console.warn('Warning: MBD AI API key not found. Some features may be limited.')
  // Don't throw error, allow fallback to test data
  MBD_AI_CONFIG.API_KEY = 'test-key'
} 