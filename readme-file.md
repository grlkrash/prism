# Prism: Cultural Token Discovery Platform

Prism is a platform for discovering, curating, and sharing cultural tokens using AI-powered recommendations. The project integrates Farcaster Frames, Base Agent, and MBD AI to create a SocialFi application for cultural token discovery.

## Quick Start

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with necessary API keys
4. Run the development server:
   ```bash
   npm run dev
   ```

## Project Overview

Prism addresses three hackathon bounties:

1. **Best Farcaster Frame using MBD AI models and APIs**
   - Interactive gallery Frame for browsing cultural tokens
   - AI-powered token analysis and recommendations
   - Quick-action buttons for collecting, sharing, and saving tokens

2. **Best Base Agent using MBD AI models and APIs**
   - Personalized token recommendations based on user preferences
   - Natural language interface for describing desired tokens/art styles
   - Reasoning behind recommendations with artistic insights

3. **Best SocialFi application**
   - Users earn "Curator Points" for discovering tokens that later become popular
   - Leaderboard of top curators
   - Social sharing of collections and discoveries
   - Building public reputation as a cultural curator

## Demo Guide

### 1. Farcaster Frame Demo

The Frame can be tested by visiting `/api/frame` in your browser. For demonstration purposes:

1. Show the visual gallery of tokens
2. Navigate between tokens using the Frame buttons
3. Demonstrate the "Collect" action for curator points
4. Show how the agent provides recommendations

### 2. Base Agent Demo

To demonstrate the agent capabilities:

1. Show natural language queries for token discovery
2. Highlight how the agent uses MBD AI to analyze preferences
3. Show personalized token recommendations
4. Explain the reasoning behind recommendations

### 3. SocialFi Features Demo

To showcase the SocialFi components:

1. Show the curator leaderboard
2. Demonstrate earning points for discovering tokens
3. Show user ranking and reputation building
4. Present the social sharing features

## Implementation Notes

- For the hackathon, we've used simulated MBD AI responses to save time
- In a production environment, these would be replaced with actual API calls
- The Frame implementation follows the Farcaster Frame specification
- The Agent uses Agentkit with simulated MBD AI integration

## Future Enhancements

- Integration with actual token marketplaces
- Advanced collection tools with portfolio analysis
- Enhanced social features including user following
- Expanded AI analysis capabilities

## Tech Stack

- Next.js with TypeScript
- Farcaster Frames SDK
- Agentkit for Base Agent
- MBD AI for token analysis
- Tailwind CSS for styling
