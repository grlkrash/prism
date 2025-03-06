/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['example.com'], // Add your image domains here
  },
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    MBD_API_KEY: process.env.MBD_API_KEY,
    FARCASTER_API_KEY: process.env.FARCASTER_API_KEY,
    NEXT_PUBLIC_FARCASTER_HUB_URL: process.env.NEXT_PUBLIC_FARCASTER_HUB_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  },
  webpack: (config) => {
    config.resolve.fallback = { 
      fs: false, 
      net: false, 
      tls: false,
      crypto: false
    }
    return config
  }
}

// Use CommonJS exports
module.exports = nextConfig 