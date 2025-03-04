// app/api/agent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAgent } from 'agentkit';

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
    const { query } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Invalid query parameter' },
        { status: 400 }
      );
    }
    
    // Analyze the query using our simulated MBD AI function
    const recommendations = await mbdAnalyzeTokens(query);
    
    // Format the agent response
    const responseText = `Based on your interest in ${query}, I recommend exploring these cultural tokens:
    
    ${recommendations.map((token, index) => `${index + 1}. ${token}`).join('\n')}
    
    These recommendations match your preferences based on community engagement, artistic merit, and cultural relevance. Would you like more specific recommendations?`;
    
    // Build the response for the Farcaster Frame
    const frameHtml = `<!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="https://placehold.co/600x400/4169E1/FFFFFF?text=Your+Recommendations" />
        <meta property="fc:frame:button:1" content="View ${recommendations[0]}" />
        <meta property="fc:frame:button:2" content="View ${recommendations[1]}" />
        <meta property="fc:frame:button:3" content="More Recommendations" />
        <meta property="fc:frame:button:4" content="Back to Gallery" />
        <meta property="og:title" content="Prism: Your Personalized Recommendations" />
        <meta property="og:description" content="Cultural tokens matched to your interests" />
      </head>
    </html>`;
    
    return NextResponse.json({
      agentResponse: responseText,
      frameHtml: frameHtml,
      recommendations: recommendations
    });
    
  } catch (error) {
    console.error('Agent error:', error);
    return NextResponse.json(
      { error: 'Failed to process agent request' },
      { status: 500 }
    );
  }
}
