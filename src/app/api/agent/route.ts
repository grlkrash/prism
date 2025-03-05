// app/api/agent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { AGENTKIT_CONFIG } from '@/config/agentkit';
import { extractTokenRecommendations, extractActions } from '@/utils/agentkit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: NextRequest) {
  try {
    const { message, userId, context } = await req.json();
    const threadId = `grlkrash-agent-${crypto.randomUUID()}`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: AGENTKIT_CONFIG.MODEL,
      temperature: AGENTKIT_CONFIG.TEMPERATURE,
      max_tokens: AGENTKIT_CONFIG.MAX_TOKENS,
      messages: [
        { role: 'system', content: AGENTKIT_CONFIG.SYSTEM_PROMPT },
        { role: 'user', content: message }
      ]
    });

    const content = completion.choices[0]?.message?.content || '';
    
    // Extract recommendations and actions
    const tokenRecommendations = extractTokenRecommendations(content);
    const actions = extractActions(content);

    return NextResponse.json({
      id: threadId,
      content,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      metadata: {
        tokenRecommendations,
        actions
      }
    });
  } catch (error) {
    console.error('Error in agent route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
