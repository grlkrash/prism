// app/api/agent/route.ts
import { NextResponse } from 'next/server';
import { sendMessage } from '@/utils/agentkit';
import { logger } from '@/utils/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Log the incoming request
    logger.info('Agent request:', {
      message: body.message,
      userId: body.userId,
      hasContext: !!body.context
    });

    const response = await sendMessage(body);
    
    // Log the response for debugging
    logger.info('Agent response:', {
      hasContent: !!response.content,
      hasRecommendations: Array.isArray(response.metadata?.tokenRecommendations) && response.metadata.tokenRecommendations.length > 0,
      hasActions: Array.isArray(response.metadata?.actions) && response.metadata.actions.length > 0
    });

    return NextResponse.json(response);
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
