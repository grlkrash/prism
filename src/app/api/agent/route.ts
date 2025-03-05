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
      hasRecommendations: !!response.metadata?.tokenRecommendations?.length,
      hasActions: !!response.metadata?.actions?.length
    });

    // Ensure we have a valid response
    const validResponse = {
      ...response,
      content: response.content || 'No response content',
      metadata: {
        ...response.metadata,
        tokenRecommendations: response.metadata?.tokenRecommendations || [],
        actions: response.metadata?.actions || [],
        friendActivities: response.metadata?.friendActivities || [],
        referrals: response.metadata?.referrals || []
      }
    };

    return NextResponse.json(validResponse);
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
