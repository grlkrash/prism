// app/api/agent/route.ts
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { OpenAI } from 'openai';

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

    // Get recommendations from OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{
        role: "system",
        content: "You are an expert in cultural tokens and digital art. Provide token recommendations in this format:\n\nToken Recommendations:\n1. TokenName ($SYMBOL): Description\n\nActions:\nview|SYMBOL|View Details\nbuy|SYMBOL|Buy Now\nshare|SYMBOL|Share Token"
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

    return NextResponse.json({ content });
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
