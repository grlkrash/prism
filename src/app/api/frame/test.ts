import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables with debug logging
const envPath = path.resolve(process.cwd(), '.env.local')
console.log('Loading environment from:', envPath)
const result = dotenv.config({ path: envPath })

if (result.error) {
  console.error('Error loading environment variables:', result.error)
} else {
  console.log('Environment variables loaded successfully')
  console.log('OpenAI Key present:', !!process.env.OPENAI_API_KEY)
  console.log('MBD AI Key present:', !!process.env.NEXT_PUBLIC_MBD_AI_API_KEY)
}

async function testFrame() {
  console.log('Testing Frame Functionality...')
  
  // Test GET request
  console.log('\nTesting GET request...')
  const getReq = new NextRequest('http://localhost:3000/api/frame')
  const getRes = await GET(getReq)
  console.log('GET Response Status:', getRes.status)
  console.log('GET Response HTML:', await getRes.text())
  
  // Test POST request with fid
  console.log('\nTesting POST request with fid...')
  const postReq = new NextRequest('http://localhost:3000/api/frame', {
    method: 'POST',
    body: JSON.stringify({
      untrustedData: {
        fid: 3, // Dan Romero's FID
        buttonIndex: 3,
        castId: { fid: 3, hash: '0x123' }
      },
      trustedData: {
        messageBytes: '0x123'
      }
    })
  })
  const postRes = await POST(postReq)
  console.log('POST Response Status:', postRes.status)
  console.log('POST Response HTML:', await postRes.text())
}

testFrame().catch(console.error) 