import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/frame/route'
import { MBD_AI_CONFIG } from '@/config/mbdAi'

describe('Frame Route Integration Tests', () => {
  beforeEach(() => {
    // Reset environment
    process.env.NODE_ENV = 'test'
    process.env.MBD_API_KEY = 'mbd_live_test_key_123'
    process.env.MBD_AI_API_URL = 'https://api.mbd.xyz/v2'
    process.env.NEXT_PUBLIC_FARCASTER_API_URL = 'https://api.warpcast.com/v2'
    process.env.OPENAI_API_KEY = 'test-openai-key'
  })

  describe('GET Handler', () => {
    it('should return valid frame HTML', async () => {
      const req = new NextRequest('http://localhost:3000/api/frame')
      const response = await GET(req)
      
      expect(response.status).toBe(200)
      const html = await response.text()
      
      // Verify frame metadata
      expect(html).toContain('<meta property="fc:frame" content="vNext"')
      expect(html).toContain('<meta property="fc:frame:image"')
      expect(html).toContain('<meta property="fc:frame:post_url"')
      expect(html).toContain('<meta property="fc:frame:button:')
      
      // Verify content
      expect(html).toContain('Prism: Cultural Tokens')
      expect(html).toMatch(/Discover|Popular|New|Refresh/)
    })
  })

  describe('POST Handler', () => {
    it('should handle valid frame interaction', async () => {
      const req = new NextRequest('http://localhost:3000/api/frame', {
        method: 'POST',
        body: JSON.stringify({
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
        })
      })

      const response = await POST(req)
      expect(response.status).toBe(200)
      
      const html = await response.text()
      expect(html).toContain('Cultural Score:')
      expect(html).toMatch(/Category:|Tags:|Analysis:/)
    })

    it('should handle invalid frame message', async () => {
      const req = new NextRequest('http://localhost:3000/api/frame', {
        method: 'POST',
        body: JSON.stringify({
          untrustedData: {
            buttonIndex: 'invalid'
          }
        })
      })

      const response = await POST(req)
      expect(response.status).toBe(200) // Frame spec requires 200 even for errors
      
      const html = await response.text()
      expect(html).toContain('Invalid frame message')
    })

    it('should integrate with MBD AI for recommendations', async () => {
      const req = new NextRequest('http://localhost:3000/api/frame', {
        method: 'POST',
        body: JSON.stringify({
          untrustedData: {
            buttonIndex: 1, // Discover button
            fid: 3621,
            url: 'http://localhost:3000/frames',
            messageHash: '0x123',
            timestamp: Date.now(),
            network: 1
          },
          trustedData: {
            messageBytes: '0x456'
          }
        })
      })

      const response = await POST(req)
      expect(response.status).toBe(200)
      
      const html = await response.text()
      
      // Verify MBD AI integration
      expect(html).toContain('Cultural Score:')
      expect(html).toMatch(/Category:|Tags:|Analysis:/)
    })

    it('should handle MBD AI errors gracefully', async () => {
      // Save original key
      const originalKey = process.env.MBD_API_KEY
      
      // Simulate API error by removing key
      process.env.MBD_API_KEY = ''
      
      const req = new NextRequest('http://localhost:3000/api/frame', {
        method: 'POST',
        body: JSON.stringify({
          untrustedData: {
            buttonIndex: 1,
            fid: 3621,
            url: 'http://localhost:3000/frames',
            messageHash: '0x123',
            timestamp: Date.now(),
            network: 1,
            buttonId: 'discover'
          }
        })
      })
      
      const response = await POST(req)
      expect(response.status).toBe(500)
      
      const html = await response.text()
      expect(html).toContain('Something went wrong')
      
      // Restore API key
      process.env.MBD_API_KEY = originalKey
    })
  })
}) 