// app/utils/mbdAi.ts
/*
 * This file contains utility functions for interacting with MBD AI APIs.
 * For the hackathon demo, we'll use simulated responses, but these 
 * functions would be replaced with actual API calls in a production app.
 */

export interface Token {
  id: string;
  name: string;
  symbol: string;
  description: string;
  artistName: string;
  artistBio?: string;
  imageUrl: string;
  category: string[];
  traits: string[];
  communitySize?: number;
  launchDate?: string;
  socialLinks?: {
    twitter?: string;
    discord?: string;
    website?: string;
  };
}

// Simulated token database for the demo
const tokenDatabase: Token[] = [
  {
    id: '1',
    name: 'Digital Renaissance',
    symbol: 'DGRNC',
    description: 'A community token celebrating digital art pioneers and supporting new creators in the space.',
    artistName: 'Metagallery Collective',
    artistBio: 'A decentralized collective of digital artists focused on experimentation and innovation.',
    imageUrl: 'https://placehold.co/600x400/5F4B8B/FFFFFF?text=Digital+Renaissance',
    category: ['digital art', 'generative', 'collective'],
    traits: ['innovative', 'community-driven', 'experimental'],
    communitySize: 2800,
    launchDate: '2024-01-15',
    socialLinks: {
      twitter: '@digital_renaissance',
      discord: 'discord.gg/digitalrenaissance',
      website: 'digitalrenaissance.art'
    }
  },
  {
    id: '2',
    name: 'Soundwave',
    symbol: 'SNDWV',
    description: 'Token supporting underground music artists and providing exclusive access to limited releases.',
    artistName: 'Audio Collective',
    artistBio: 'A group of music producers and DJs creating a decentralized platform for underground music.',
    imageUrl: 'https://placehold.co/600x400/4682B4/FFFFFF?text=Soundwave',
    category: ['music', 'audio', 'underground'],
    traits: ['exclusive', 'community-focused', 'niche'],
    communitySize: 1500,
    launchDate: '2023-11-20',
    socialLinks: {
      twitter: '@soundwave_token',
      discord: 'discord.gg/soundwave',
      website: 'soundwavetoken.xyz'
    }
  },
  {
    id: '3',
    name: 'Urban Canvas',
    symbol: 'URBN',
    description: 'Supporting street artists worldwide by providing funding for public art projects.',
    artistName: 'StreetArtDAO',
    artistBio: 'A decentralized autonomous organization dedicated to funding public art globally.',
    imageUrl: 'https://placehold.co/600x400/FF6347/FFFFFF?text=Urban+Canvas',
    category: ['street art', 'urban', 'public space'],
    traits: ['community-governed', 'impact-focused', 'global'],
    communitySize: 3200,
    launchDate: '2023-09-05',
    socialLinks: {
      twitter: '@urban_