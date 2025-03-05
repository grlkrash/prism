import { NobleEd25519Signer } from "@farcaster/hub-nodejs"
import { randomBytes } from 'crypto'
import { promises as fs } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function generateKeys() {
  try {
    // Generate random private key
    const privateKey = randomBytes(32)
    const signer = new NobleEd25519Signer(privateKey)
    
    // Get public key
    const publicKeyResult = await signer.getSignerKey()
    if (publicKeyResult.isErr()) throw publicKeyResult.error
    
    const publicKey = publicKeyResult.value
    
    // Read existing .env.local if it exists
    const envPath = join(dirname(__dirname), '.env.local')
    let existingEnv = ''
    try {
      existingEnv = await fs.readFile(envPath, 'utf8')
    } catch (err) {
      // File doesn't exist, that's ok
    }
    
    // Add new keys
    const envContent = `${existingEnv}\n
# Farcaster Keys
FARCASTER_PRIVATE_KEY=${privateKey.toString('hex')}
FARCASTER_PUBLIC_KEY=${publicKey}
# Add your FID after registering the key at https://warpcast.com/~/developers
FARCASTER_FID=
`
    
    await fs.writeFile(envPath, envContent.trim() + '\n')
    
    console.log('✅ Generated Farcaster keys and added to .env.local')
    console.log('📋 Public Key:', publicKey)
    console.log('\n📝 Next steps:')
    console.log('1. Register this key at https://warpcast.com/~/developers')
    console.log('2. Add your FID to .env.local')
    console.log('3. Restart your development server\n')
  } catch (error) {
    console.error('❌ Error generating keys:', error)
    process.exit(1)
  }
}

generateKeys() 