# Prism - Farcaster Frame for Cultural Tokens

A Next.js application that implements a Farcaster Frame for discovering and interacting with cultural tokens.

## Features

- Browse cultural tokens
- Collect tokens
- Interact with AI agent for recommendations
- SocialFi features for curation

## Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with required environment variables:
   ```
   NEXT_PUBLIC_MBD_AI_API_KEY=your_mbd_ai_key
   NEXT_PUBLIC_BASE_RPC_URL=your_base_rpc_url
   AGENTKIT_API_KEY=your_agentkit_key
   NEXT_PUBLIC_WARPCAST_API_URL=https://api.warpcast.com/v2
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Testing the Frame

1. Deploy to Vercel
2. Use the Warpcast playground to test the frame
3. Frame URL: `https://your-vercel-domain.vercel.app/api/frame`

## Environment Variables

The following environment variables are required:

## MBD AI Configuration
- `MBD_API_KEY`: API key for MBD AI
- `MBD_AI_API_URL`: MBD AI API URL (defaults to https://api.mbd.xyz/v2)

## Farcaster Configuration
- `NEXT_PUBLIC_FARCASTER_API_URL`: Farcaster API URL
- `NEXT_PUBLIC_FARCASTER_HUB_URL`: Farcaster Hub URL
- `FARCASTER_FID`: Your Farcaster ID
- `FARCASTER_PRIVATE_KEY`: Your Farcaster private key
- `FARCASTER_PUBLIC_KEY`: Your Farcaster public key

## Tech Stack

- Next.js 14
- TypeScript
- Farcaster Frames SDK
- TailwindCSS
- Agentkit
- Base Web3 SDK