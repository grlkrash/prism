# Prism: Implementation Instructions

## Project Setup

1. Initialize Next.js project with TypeScript
```bash
npx create-next-app@latest prism --typescript --tailwind --app
cd prism
```

2. Install required dependencies
```bash
npm install @farcaster/frame-sdk agentkit @base-api/web3-sdk framer-motion ethers
```

3. Set up environment variables
```
# Create a .env.local file with:
NEXT_PUBLIC_MBD_AI_API_KEY=your_mbd_ai_key
NEXT_PUBLIC_BASE_RPC_URL=your_base_rpc_url
```

## Project Structure

```
/app
  /api
    /frame - Farcaster Frame endpoints
    /agent - Base Agent endpoints
  /components
    /frame - Frame UI components
    /agent - Agent conversation components
    /tokens - Token display components
  /contexts - React contexts
  /hooks - Custom hooks
  /utils - Utility functions
  /types - TypeScript type definitions
```

## Implementation Steps

### 1. Farcaster Frame Setup (45 minutes)

1. Create a basic frame using frames.town gallery template as reference
2. Set up frame metadata in `/app/api/frame/route.ts`
3. Implement basic gallery view for tokens
4. Add action buttons for interaction

### 2. MBD AI Integration (45 minutes)

1. Create utility functions for MBD AI API calls in `/app/utils/mbdAi.ts`
2. Implement token analysis functions
3. Set up image recognition for token visuals
4. Connect AI analysis to frame display

### 3. Base Agent Implementation (60 minutes)

1. Configure Agentkit in `/app/api/agent/route.ts`
2. Define agent conversation flows
3. Create agent UI components
4. Connect agent to MBD AI for recommendations

### 4. SocialFi Components (45 minutes)

1. Create simple point system for curation
2. Implement leaderboard display
3. Set up token collection functionality
4. Add social sharing capabilities

### 5. Final Integration and Testing (15 minutes)

1. Combine all components
2. Test frame functionality
3. Verify agent responses
4. Check SocialFi features

## Quick Reference: API Endpoints

### Farcaster Frames

```typescript
// Example frame route
import { FrameRequest, getFrameMessage } from '@farcaster/frame-sdk';

export async function POST(req: Request) {
  const body = await req.json();
  const { isValid, message } = await getFrameMessage(body);
  
  // Process frame action and return response
}
```

### MBD AI

```typescript
// Example MBD AI call
async function analyzeToken(tokenData) {
  const response = await fetch('https://api.mbd.ai/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_MBD_AI_API_KEY}`
    },
    body: JSON.stringify(tokenData)
  });
  
  return response.json();
}
```

### Agentkit

```typescript
// Example agent setup
import { Agent, createAgent } from 'agentkit';

const agent = createAgent({
  apiKey: process.env.CDP_API_KEY_NAME,
  model: 'mbd-ai-model',
  tools: [
    // Define tools for the agent
  ]
});
```

## Demo Preparation

1. Prepare 3-5 example cultural tokens with images and data
2. Create a short demo script showing key features
3. Highlight how the project meets all three bounty requirements
4. Prepare to explain how MBD AI enhances the discovery experience

## Troubleshooting

- If frame doesn't render: Check CORS settings and frame metadata
- If agent doesn't respond: Verify API keys and request format
- If MBD AI integration fails: Check API quotas and response formatting
