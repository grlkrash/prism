// app/api/agent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendMessage, getTokenRecommendations, analyzeTokenWithAgent } from '@/utils/agentkit';
import { agentRequestSchema } from '@/config/agentkit';
import { logger } from '@/utils/logger';

// This is a simplified implementation - in a real app, you would connect to the actual MBD AI API
const mbdAnalyzeTokens = async (query: string) => {
  // In a real implementation, this would call the MBD AI API
  const tokenCategories = {
    'art': ['Digital Renaissance', 'Urban Canvas', 'Pixel Collective'],
    'music': ['Soundwave', 'BeatDAO', 'Harmony Token'],
    'literature': ['Prose Token', 'Poet Society', 'Narrative Collective'],
    'film': ['Director\'s Cut', 'Scene DAO', 'Film Enthusiasts'],
  };
  
  // Simple keyword matching for the demo
  const lowercaseQuery = query.toLowerCase();
  let recommendations = [];
  
  if (lowercaseQuery.includes('art') || lowercaseQuery.includes('visual') || lowercaseQuery.includes('paint')) {
    recommendations = tokenCategories.art;
  } else if (lowercaseQuery.includes('music') || lowercaseQuery.includes('sound') || lowercaseQuery.includes('audio')) {
    recommendations = tokenCategories.music;
  } else if (lowercaseQuery.includes('book') || lowercaseQuery.includes('write') || lowercaseQuery.includes('story')) {
    recommendations = tokenCategories.literature;
  } else if (lowercaseQuery.includes('movie') || lowercaseQuery.includes('film') || lowercaseQuery.includes('cinema')) {
    recommendations = tokenCategories.film;
  } else {
    // Provide a mix of recommendations if no specific category is mentioned
    recommendations = [
      tokenCategories.art[0],
      tokenCategories.music[0],
      tokenCategories.literature[0],
    ];
  }
  
  return recommendations;
};

// Implement the agent handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedRequest = agentRequestSchema.parse(body);

    let response;
    switch (validatedRequest.message.toLowerCase()) {
      case 'recommend tokens':
        response = await getTokenRecommendations(
          validatedRequest.userId || 'anonymous',
          validatedRequest.context?.userPreferences
        );
        break;
      case 'analyze token':
        if (!validatedRequest.context?.currentToken?.id) {
          return NextResponse.json(
            { error: 'Token ID is required for analysis' },
            { status: 400 }
          );
        }
        response = await analyzeTokenWithAgent(
          validatedRequest.context.currentToken.id,
          validatedRequest.userId || 'anonymous'
        );
        break;
      default:
        response = await sendMessage(validatedRequest);
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error in agent API route:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    if (error.name === 'RateLimitError') {
      return NextResponse.json(
        { error: error.message },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
