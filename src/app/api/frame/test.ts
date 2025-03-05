import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

// Import after loading environment variables
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

async function main() {
  console.log('Testing frame functionality...')
  console.log('Environment variables loaded:', {
    MBD_AI_URL: process.env.NEXT_PUBLIC_MBD_AI_API_URL,
    MBD_AI_KEY: process.env.NEXT_PUBLIC_MBD_AI_API_KEY?.slice(0, 10) + '...',
  })

  // Test GET request
  console.log('\nTesting GET request...')
  const getReq = new NextRequest('http://localhost:3000/api/frame')
  const getRes = await GET(getReq)
  console.log('GET Response Status:', getRes.status)
  console.log('GET Response HTML:', await getRes.text())

  // Test POST request
  console.log('\nTesting POST request...')
  const postReq = new NextRequest('http://localhost:3000/api/frame', {
    method: 'POST',
    body: JSON.stringify({
      untrustedData: {
        fid: 3, // Dan Romero's FID
        buttonIndex: 1,
        castId: {
          fid: 3,
          hash: '0x123'
        }
      }
    })
  })
  const postRes = await POST(postReq)
  console.log('POST Response Status:', postRes.status)
  console.log('POST Response HTML:', await postRes.text())
}

main().catch(console.error) 