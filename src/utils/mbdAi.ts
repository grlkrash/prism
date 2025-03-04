import { NextRequest } from 'next/server'

export interface Token {
  id: number
  name: string
  description: string
  imageUrl: string
  artistName: string
  price: string
  social?: {
    twitter?: string
    discord?: string
    website?: string
  }
}

export const tokenDatabase: Token[] = [
  {
    id: 1,
    name: "Digital Dreams #1",
    description: "A mesmerizing piece of digital art",
    imageUrl: "https://picsum.photos/800/600",
    artistName: "AI Artist",
    price: "0.1 ETH",
    social: {
      twitter: 'twitter.com/digitalrenaissance',
      discord: 'discord.gg/digitalrenaissance',
      website: 'digitalrenaissance.art'
    }
  },
  {
    id: 2,
    name: "Sound Wave #1",
    description: "A symphony of digital sound",
    imageUrl: "https://picsum.photos/800/601",
    artistName: "Sound Artist",
    price: "0.1 ETH",
    social: {
      twitter: 'twitter.com/soundwave',
      discord: 'discord.gg/soundwave',
      website: 'soundwavetoken.xyz'
    }
  },
  {
    id: 3,
    name: "Urban Canvas #1",
    description: "Street art meets digital world",
    imageUrl: "https://picsum.photos/800/602",
    artistName: "Urban Artist",
    price: "0.1 ETH",
    social: {
      twitter: 'twitter.com/urbancanvas',
      discord: 'discord.gg/urbancanvas',
      website: 'urbancanvas.art'
    }
  }
]

export async function validateFrameRequest(req: NextRequest) {
  try {
    const body = await req.json()
    // For now, we'll just validate the basic structure
    const isValid = body && typeof body === 'object' && 'untrustedData' in body
    return {
      isValid,
      message: isValid ? {
        button: body.untrustedData?.buttonIndex || 0,
        inputText: body.untrustedData?.text || '',
        fid: body.untrustedData?.fid
      } : null
    }
  } catch (error) {
    console.error('Error validating frame request:', error)
    return { isValid: false, message: null }
  }
}

export const frameActions = {
  close: async () => {
    // Implement close action
  },
  openUrl: async (url: string) => {
    // Implement open URL action
  }
} 