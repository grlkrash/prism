import { farcasterRequest } from './farcaster'

interface Cast {
  hash: string
  author: {
    username: string
  }
  timestamp: string
  text: string
}

interface FeedResponse {
  casts: Cast[]
}

export async function getPersonalizedFeed(fid: string): Promise<FeedResponse> {
  try {
    const response = await farcasterRequest(`/feed?fid=${fid}&limit=10`)
    return response as FeedResponse
  } catch (error) {
    console.error('Error fetching personalized feed:', error)
    return { casts: [] }
  }
} 