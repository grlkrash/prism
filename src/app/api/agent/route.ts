// app/api/agent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendMessage, getTokenRecommendations, analyzeTokenWithAgent } from '@/utils/agentkit';
import { agentRequestSchema } from '@/config/agentkit';
import { logger } from '@/utils/logger';
import { ZodError } from 'zod';
import { searchCasts, analyzeToken } from '@/utils/mbdAi';

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
    const validatedData = agentRequestSchema.parse(body);
    
    // Get token recommendations based on user query
    const searchResults = await searchCasts(validatedData.message);
    const parsedResults = JSON.parse(searchResults);
    
    if (!parsedResults || !Array.isArray(parsedResults.casts)) {
      throw new Error('Invalid search results format');
    }

    const analyzedTokens = await Promise.all(
      parsedResults.casts.map(async (cast: any) => {
        // Extract token info from cast
        const token = {
          id: cast.hash || crypto.randomUUID(),
          name: cast.text?.substring(0, 50) || 'Untitled Token', // Use first 50 chars as name
          description: cast.text || 'No description available',
          imageUrl: cast?.author?.pfp || 'https://placehold.co/400',
          artistName: cast?.author?.displayName || cast?.author?.username || 'Anonymous',
          price: '0.1 ETH' // This would come from your token marketplace
        };
        
        // Analyze token with MBD AI
        return await analyzeToken(token, validatedData.userId);
      })
    );
    
    // Process with agent
    const response = await sendMessage({
      message: validatedData.message,
      userId: validatedData.userId,
      context: {
        ...validatedData.context,
        mbdAnalysis: analyzedTokens
      }
    });
    
    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error in agent route:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.name === 'RateLimitError') {
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
