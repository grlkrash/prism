// app/api/agent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/utils/agentkit';
import { agentRequestSchema, agentResponseSchema } from '@/config/agentkit';
import { logger } from '@/utils/logger';
import { ZodError } from 'zod';
import { z } from 'zod';

const requestSchema = z.object({
  message: z.string(),
  userId: z.string().optional(),
  context: z.record(z.any()).optional()
});

// Implement the agent handler
export async function POST(req: NextRequest) {
  try {
    // Parse and validate request
    const body = await req.json();
    const validatedRequest = requestSchema.parse(body);

    // Send message to agent
    const response = await sendMessage(validatedRequest);

    // Return formatted response
    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error in agent route:', error);
    
    // Handle specific error types
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      const status = (error as any).status || 500;
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
