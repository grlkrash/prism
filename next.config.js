/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  // Validate environment variables at build time
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Validate required environment variables during build
      const requiredEnvs = ['OPENAI_API_KEY']
      for (const env of requiredEnvs) {
        if (!process.env[env]) {
          throw new Error(`${env} environment variable is required but not set.`)
        }
      }
    }
    return config
  },
  images: {
    domains: ['placehold.co', 'picsum.photos'],
  },
  async headers() {
    return [
      {
        source: '/api/frame',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type',
          },
          {
            key: 'Cache-Control',
            value: 'no-store',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/frame',
        destination: '/api/frame',
      },
    ]
  },
}

module.exports = nextConfig 