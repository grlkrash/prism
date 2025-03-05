import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

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
        fid: 1,
        buttonIndex: 3,
        castId: { fid: 1, hash: '0x123' }
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