# Project Prism: Product Requirements Document

## Overview
Prism is a Farcaster Frame application that helps users discover, curate, and share artist/cultural tokens using AI-powered recommendations. The platform rewards users for their curation skills when they discover tokens that later become popular.

## Implementation Status
✅ All core features have been implemented:
- Interactive gallery Frame with token browsing
- MBD AI-powered recommendations
- Social curation mechanics
- Base agent integration
- WagmiProvider for wallet interactions
- Friend activity tracking
- Referral system
- Cultural scoring

## Problem Statement
The cultural token space is growing rapidly, but discovery remains difficult. Artists struggle to gain visibility, while collectors have trouble finding authentic culture tokens amid the noise. The community lacks tools that combine AI-powered discovery with social curation.

## Target Audience
- Artists creating culture/community tokens
- Collectors interested in supporting artistic/cultural endeavors
- Farcaster users who value community curation
- Cultural tastemakers looking to demonstrate their discovery skills

## Core Features

### 1. AI-Powered Token Discovery (Farcaster Frame) ✅
- ✅ Interactive gallery Frame for browsing cultural tokens
- ✅ MBD AI-powered token analysis and recommendation
- ✅ Visual presentation of token art/imagery  
- ✅ Quick-action buttons for collecting, sharing, and saving tokens

### 2. Intelligent Curation Agent (Base Agent + MBD AI) ✅
- ✅ Personalized token recommendations based on user preferences
- ✅ Natural language interface for describing desired tokens/art styles
- ✅ Agent assists in building collections with complementary tokens
- ✅ Explains reasoning behind recommendations with artistic insights

### 3. Social Curation Mechanics (SocialFi) ✅
- ✅ Users earn "Curator Points" when tokens they discover gain adoption
- ✅ Leaderboard of top curators visible in the Frame
- ✅ Social sharing of collections and discoveries
- ✅ Building public reputation as a cultural curator

## Technical Requirements

### Farcaster Frame Integration ✅
- ✅ Implement Frame UI using frames.town template
- ✅ Create interactive gallery view for tokens
- ✅ Add buttons for core actions (collect, share, save)
- ✅ WagmiProvider integration for wallet interactions

### MBD AI Integration ✅
- ✅ Use MBD AI models for token analysis and categorization
- ✅ Implement image recognition for visual token analysis
- ✅ Sentiment analysis on token communities and conversations

### Base Agent Implementation ✅
- ✅ Build using Agentkit
- ✅ Create conversation flows for token discovery
- ✅ Implement preference learning from user interactions
- ✅ Develop recommendation algorithm using MBD AI

### SocialFi Components ✅
- ✅ Track user curation actions and discoveries
- ✅ Implement point system for successful discoveries
- ✅ Create leaderboard functionality
- ✅ Design token collection visualization

## Success Metrics
- Number of unique users interacting with the Frame
- Tokens discovered through the platform
- User engagement with the curation agent
- Community feedback on the discovery experience

## MVP Scope (3.5 hour implementation) ✅
- ✅ Functional Farcaster Frame with gallery view
- ✅ Basic agent implementation with MBD AI integration
- ✅ Simple curation point system
- ✅ 3-5 example tokens pre-loaded for demonstration

## Future Enhancements (Post-MVP)
- Integration with token marketplaces
- Advanced collection tools
- Enhanced social features
- Analytics dashboard for artists

## Current Implementation Notes
- All core features implemented and tested
- WagmiProvider integration complete
- Frame connector implementation complete
- Type system improvements added
- Enhanced error handling and state management
- Social features integrated and tested
- Real data integration verified
