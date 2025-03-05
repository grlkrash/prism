import '@testing-library/jest-dom'

// Mock fetch globally
global.fetch = jest.fn()

// Mock environment variables
process.env.MBD_API_KEY = 'mbd-test-key'
process.env.MBD_AI_API_URL = 'https://api.mbd.xyz/v2'
process.env.NEXT_PUBLIC_FARCASTER_API_URL = 'https://api.warpcast.com' 