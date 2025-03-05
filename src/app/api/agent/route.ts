// app/api/agent/route.ts
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { OpenAI } from 'openai';
import { getTokenMentions, extractTokenMentions, FarcasterCast } from '@/utils/farcaster';

interface TokenMention {
  tokenId: string;
  category?: string;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Log the incoming request
    logger.info('Agent request:', {
      message: body.message,
      userId: body.userId,
      hasContext: !!body.context
    });

    // Get base URL for API calls
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
    const requestUrl = new URL(request.url)
    const host = process.env.NEXT_PUBLIC_HOST_URL || requestUrl.host
    const baseUrl = `${protocol}://${host}`

    // Get art/culture token mentions from Farcaster
    const tokenMentions = await getTokenMentions('art', 20);
    const artTokens = tokenMentions
      .map((cast: FarcasterCast) => extractTokenMentions(cast.text))
      .flat()
      .filter((mention: TokenMention) => mention.category === 'art' || mention.category === 'culture');

    // Get recommendations from OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{
        role: "system",
        content: `You are an expert in cultural tokens and digital art. Focus on tokens related to art and culture.
Current trending art/culture tokens from Farcaster: ${artTokens.map((t: TokenMention) => '$' + t.tokenId).join(', ')}

Provide token recommendations in this format:
Token Recommendations:
1. TokenName ($SYMBOL): Description focused on cultural and artistic significance

Actions:
view|SYMBOL|View Details
buy|SYMBOL|Buy Now
share|SYMBOL|Share Token`
      }, {
        role: "user",
        content: body.message
      }],
      temperature: 0.7,
      max_tokens: 1000
    });

    const content = completion.choices[0]?.message?.content || '';
    
    // Log the response for debugging
    logger.info('Agent response:', {
      hasContent: !!content,
      content
    });

    return NextResponse.json({ 
      content,
      metadata: {
        baseUrl,
        tokenRecommendations: artTokens
      }
    });
  } catch (error) {
    logger.error('Error in agent route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.stack : undefined
      },
      { status: error instanceof Error && 'status' in error ? (error as any).status : 500 }
    );
  }
}
