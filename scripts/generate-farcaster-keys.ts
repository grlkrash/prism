import { NobleEd25519Signer } from "@farcaster/hub-nodejs"
import { randomBytes } from 'crypto'
import * as fs from 'fs'

async function generateKeys() {
  // Generate random private key
  const privateKey = randomBytes(32)
  const signer = new NobleEd25519Signer(privateKey)
  
  // Get public key
  const publicKeyResult = await signer.getSignerKey()
  if (publicKeyResult.isErr()) throw publicKeyResult.error
  
  const publicKey = publicKeyResult.value
  
  // Save to .env.local
  const envContent = `
# Farcaster Keys
FARCASTER_PRIVATE_KEY=${privateKey.toString('hex')}
FARCASTER_PUBLIC_KEY=${publicKey}
# Add your FID after registering the key
FARCASTER_FID=
`
  
  fs.writeFileSync('.env.local', envContent, { flag: 'a' })
  
  console.log('Generated Farcaster keys and added to .env.local')
  console.log('Public Key:', publicKey)
  console.log('\nNext steps:')
  console.log('1. Register this key at https://warpcast.com/~/developers')
  console.log('2. Add your FID to .env.local')
}

generateKeys().catch(console.error) 