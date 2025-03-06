import { NextRequest } from 'next/server'
import { validateFrameRequest } from '../mbdAi'
import sdk from '@farcaster/frame-sdk'

// Mock the frame SDK
jest.mock('@farcaster/frame-sdk', () => ({
  __esModule: true,
  default: {
    context: {
      location: {
        type: 'cast_embed',
        cast: {
          fid: 3621,
          hash: '0xa2fbef8c8e4d00d8f84ff45f9763b8bae2c5c544',
          text: 'Test cultural token',
          embeds: ['https://localhost:3000/frames']
        }
      }
    },
    actions: {
      ready: jest.fn()
    },
    wallet: {
      ethProvider: {
        request: jest.fn()
      }
    }
  }
}))

describe('Frame Route Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    process.env.MBD_API_KEY = 'mbd_live_test_key_123'
    process.env.MBD_AI_API_URL = 'https://api.mbd.xyz/v2'
    process.env.NEXT_PUBLIC_FARCASTER_API_URL = 'https://api.warpcast.com/v2'
    process.env.NODE_ENV = 'test'
  })

  describe('Frame Request Validation', () => {
    it('should validate a valid frame message', async () => {
      const validRequest = {
        untrustedData: {
          buttonIndex: 1,
          fid: 3621,
          url: 'http://localhost:3000/frames',
          messageHash: '0x123',
          timestamp: Date.now(),
          network: 1,
          buttonId: 'discover'
        },
        trustedData: {
          messageBytes: '0x456'
        }
      }

      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(JSON.stringify(validRequest)))
          controller.close()
        }
      })

      const { isValid, message } = await validateFrameRequest({ body })
      expect(isValid).toBe(true)
      expect(message).toBeDefined()
      expect(message?.button).toBe(1)
      expect(message?.fid).toBe(3621)
    })

    it('should reject an invalid frame message', async () => {
      const invalidRequest = {
        untrustedData: {
          buttonIndex: 'invalid', // Should be a number
          fid: 'invalid', // Should be a number
          url: 123, // Should be a string
          messageHash: 123, // Should be a string
          timestamp: 'invalid', // Should be a number
          network: 'invalid', // Should be a number
          buttonId: 123 // Should be a string
        }
      }

      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(JSON.stringify(invalidRequest)))
          controller.close()
        }
      })

      const { isValid, message } = await validateFrameRequest({ body })
      expect(isValid).toBe(false)
      expect(message).toBeUndefined()
    })
  })

  describe('Frame Context', () => {
    it('should access frame context data', async () => {
      const context = await sdk.context
      expect(context).toBeDefined()
      expect(context.location.type).toBe('cast_embed')
      expect(context.location.cast.fid).toBe(3621)
    })
  })

  describe('Frame Actions', () => {
    it('should signal ready state', () => {
      sdk.actions.ready()
      expect(sdk.actions.ready).toHaveBeenCalled()
    })
  })

  describe('Wallet Integration', () => {
    it('should handle wallet requests', async () => {
      const mockAccounts = ['0x123']
      ;(sdk.wallet.ethProvider.request as jest.Mock).mockResolvedValueOnce(mockAccounts)

      const accounts = await sdk.wallet.ethProvider.request({
        method: 'eth_requestAccounts'
      })

      expect(accounts).toEqual(mockAccounts)
      expect(sdk.wallet.ethProvider.request).toHaveBeenCalledWith({
        method: 'eth_requestAccounts'
      })
    })
  })
}) 