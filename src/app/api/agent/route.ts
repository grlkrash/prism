// app/api/agent/route.ts
import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { getTokenMentions, extractTokenMentions, FarcasterCast } from '@/utils/farcaster';
import { analyzeToken, calculateCulturalScore, type Token } from '@/utils/mbdAi';
import { getAgent, agentRequestSchema, type AgentRequest } from '@/config/agentkit';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from '@langchain/core/runnables';
import { chatModel } from '@/config/openai';

interface TokenMention {
  tokenId: string;
  category?: string;
  analysis?: Token;
  culturalScore?: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request
    const validatedRequest = agentRequestSchema.parse(body);
    
    // Log the incoming request
    logger.info('Agent request:', {
      message: validatedRequest.message,
      userId: validatedRequest.userId,
      hasContext: !!validatedRequest.context
    });

    // Get base URL for API calls
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const requestUrl = new URL(request.url);
    const host = process.env.NEXT_PUBLIC_HOST_URL || requestUrl.host;
    const baseUrl = `${protocol}://${host}`;

    // Get art/culture token mentions from Farcaster
    const tokenMentions = await getTokenMentions('art', 20);
    
    // Extract and analyze tokens
    const artTokens = await Promise.all(
      tokenMentions
        .map((cast: FarcasterCast) => extractTokenMentions(cast.text))
        .flat()
        .filter((mention: TokenMention) => mention.category === 'art' || mention.category === 'culture')
        .map(async (mention: TokenMention) => {
          try {
            // Analyze each token with MBD AI
            const analysis = await analyzeToken(mention.tokenId);
            const culturalScore = calculateCulturalScore(analysis);
            
            return {
              ...mention,
              analysis,
              culturalScore,
              socialContext: {
                mentions: tokenMentions.filter(cast => 
                  cast.text.toLowerCase().includes(mention.tokenId.toLowerCase())
                ).length,
                reactions: tokenMentions.reduce((sum, cast) => 
                  cast.text.toLowerCase().includes(mention.tokenId.toLowerCase()) 
                    ? sum + cast.reactions.likes + cast.reactions.recasts 
                    : sum, 
                  0
                )
              }
            };
          } catch (error) {
            logger.error('Error analyzing token:', error);
            return mention;
          }
        })
    );

    // Sort tokens by cultural score and social engagement
    const sortedTokens = artTokens
      .filter(token => token.culturalScore && token.analysis)
      .sort((a, b) => {
        const scoreA = (a.culturalScore || 0) * 0.7 + (a.socialContext?.reactions || 0) * 0.3;
        const scoreB = (b.culturalScore || 0) * 0.7 + (b.socialContext?.reactions || 0) * 0.3;
        return scoreB - scoreA;
      });

    // Create a custom LangChain chain for token analysis
    const analyzeTokensChain = RunnableSequence.from([
      ChatPromptTemplate.fromMessages([
        ["system", `You are an expert in cultural tokens and digital art.
Current trending tokens from Farcaster (sorted by cultural score and social engagement):

{tokenContext}

When recommending tokens:
1. Focus on tokens with high cultural scores and social engagement
2. Explain their artistic and cultural significance
3. Consider their community impact and social proof
4. Suggest relevant actions for user engagement

Format your response exactly as:
Token Recommendations:
1. TokenName ($SYMBOL): Description
   Cultural Score: [score]
   Category: [category]
   Tags: [tags]

Actions:
view|SYMBOL|View Details
buy|SYMBOL|Buy Now
share|SYMBOL|Share Token`],
        ["human", "{message}"]
      ]),
      chatModel
    ]);

    // Prepare token context
    const tokenContext = sortedTokens.map(token => `
${token.tokenId} ($${token.tokenId}):
- Cultural Score: ${token.culturalScore || 'N/A'}
- Category: ${token.analysis?.metadata?.category || 'Unknown'}
- Social Mentions: ${token.socialContext?.mentions || 0}
- Social Reactions: ${token.socialContext?.reactions || 0}
- Tags: ${token.analysis?.metadata?.tags?.join(', ') || 'None'}
    `).join('\n');

    // Get AI analysis of tokens
    const aiAnalysis = await analyzeTokensChain.invoke({
      tokenContext,
      message: validatedRequest.message
    });

    // Get the agent chain for final response
    const agent = await getAgent();

    // Add token context and AI analysis to the request
    const agentRequest: AgentRequest = {
      ...validatedRequest,
      context: {
        ...validatedRequest.context,
        trendingTokens: sortedTokens.map(token => ({
          id: token.tokenId,
          score: token.culturalScore,
          category: token.analysis?.metadata?.category,
          socialContext: token.socialContext
        })),
        aiAnalysis: aiAnalysis.content
      }
    };

    // Get agent response
    const result = await agent.invoke(agentRequest);

    return NextResponse.json({ 
      content: result.response,
      metadata: {
        baseUrl,
        tokenRecommendations: sortedTokens.map(token => ({
          tokenId: token.tokenId,
          category: token.category,
          culturalScore: token.culturalScore,
          socialContext: token.socialContext,
          analysis: token.analysis?.metadata
        }))
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
