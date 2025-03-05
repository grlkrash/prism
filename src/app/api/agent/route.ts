// app/api/agent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/utils/agentkit';
import { agentRequestSchema, agentResponseSchema } from '@/config/agentkit';
import { logger } from '@/utils/logger';
import { ZodError } from 'zod';

// Implement the agent handler
export async function POST(req: NextRequest) {
  try {
    // Ensure request body is valid JSON
    let body
    try {
      body = await req.json()
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate request data
    const validatedData = agentRequestSchema.parse(body)
    
    // Process with agent
    const response = await sendMessage({
      message: validatedData.message,
      userId: validatedData.userId || 'anonymous',
      context: validatedData.context || {}
    })
    
    // Ensure response is valid before sending
    const validatedResponse = agentResponseSchema.parse(response)
    
    return NextResponse.json(validatedResponse)
  } catch (error) {
    logger.error('Error in agent route:', error)
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.name === 'RateLimitError') {
      return NextResponse.json(
        { error: error.message },
        { status: 429 }
      )
    }

    // Log detailed error for debugging
    console.error('Detailed error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
