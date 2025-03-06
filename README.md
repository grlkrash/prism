# Prism

A decentralized social platform for cultural tokens and digital art.

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# CDP API
CDP_API_KEY_NAME=your_cdp_key_here
CDP_API_KEY_PRIVATE_KEY=your_cdp_private_key_here
NETWORK_ID=base-sepolia

# MBD AI Configuration
MBD_API_KEY=your_mbd_key_here
MBD_AI_API_URL=https://api.mbd.xyz/v2

# Farcaster Configuration
NEXT_PUBLIC_FARCASTER_API_URL=https://api.warpcast.com/v2
NEXT_PUBLIC_FARCASTER_HUB_URL=https://api.warpcast.com/v2
NEXT_PUBLIC_APP_URL=http://localhost:3000
FARCASTER_API_KEY=your_farcaster_key_here
FARCASTER_FID=your_farcaster_fid_here

# OpenAI API
OPENAI_API_KEY=your_openai_key_here

# Feature Flags
NEXT_PUBLIC_ENABLE_AGENT_CHAT=true
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

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

## Tech Stack

- Next.js 14
- TypeScript
- Farcaster Frames SDK
- TailwindCSS
- Base Web3 SDK