// app/api/agent/route.ts
import { NextResponse } from 'next/server';
import { sendMessage } from '@/utils/agentkit';
import { logger } from '@/utils/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await sendMessage(body);
    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    logger.error('Error in agent route:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: error instanceof Error && 'status' in error ? (error as any).status : 500 }
    );
  }
}
