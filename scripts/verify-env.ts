import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

console.log('Verifying environment variables...')

const requiredVars = [
  'NEXT_PUBLIC_MBD_AI_API_URL',
  'MBD_API_KEY',
  'NEXT_PUBLIC_FARCASTER_API_URL',
  'NEXT_PUBLIC_FARCASTER_HUB_URL'
]

const missing = requiredVars.filter(varName => !process.env[varName])

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:')
  missing.forEach(varName => {
    console.error(`   - ${varName}`)
  })
  process.exit(1)
}

console.log('✅ All required environment variables are set:')
requiredVars.forEach(varName => {
  const value = process.env[varName]
  console.log(`   - ${varName}: ${value?.slice(0, 10)}...`)
})

console.log('\nEnvironment verification complete!') 