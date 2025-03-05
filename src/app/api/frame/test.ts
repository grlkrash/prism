import { config } from 'dotenv'
import { resolve } from 'path'

async function main() {
  try {
    // 1. Load environment variables
    const envPath = resolve(process.cwd(), '.env.local')
    console.log('\n1. Loading Environment:')
    console.log('- Path:', envPath)
    const result = config({ path: envPath })
    console.log('- Dotenv result:', result)
    
    // 2. Verify environment state
    console.log('\n2. Environment State:')
    console.log('- MBD vars:', Object.keys(process.env).filter(key => key.includes('MBD')))
    console.log('- MBD_API_KEY exists:', !!process.env.MBD_API_KEY)
    console.log('- MBD_API_KEY format:', process.env.MBD_API_KEY?.startsWith('mbd-'))
    
    // 3. Import dependencies
    console.log('\n3. Importing Dependencies...')
    const { NextRequest } = await import('next/server')
    const { GET, POST } = await import('./route')
    
    // 4. Run tests
    console.log('\n4. Running Tests:')
    
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
          fid: 3,
          buttonIndex: 1,
          castId: { fid: 3, hash: '0x123' }
        }
      })
    })
    const postRes = await POST(postReq)
    console.log('POST Response Status:', postRes.status)
    console.log('POST Response HTML:', await postRes.text())
  } catch (error) {
    console.error('\n❌ Test Error:', error)
    throw error
  }
}

main().catch(error => {
  console.error('\n❌ Fatal Error:', error)
  process.exit(1)
}) 