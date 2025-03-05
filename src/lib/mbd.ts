const MBD_API_URL = process.env.NEXT_PUBLIC_MBD_AI_API_URL || 'https://api.mbd.xyz/v2'
const MBD_API_KEY = process.env.MBD_API_KEY

interface MBDRequestOptions {
  limit?: number
  offset?: number
  [key: string]: any
}

export async function fetchFromMBD(endpoint: string, options: MBDRequestOptions = {}) {
  const url = new URL(endpoint, MBD_API_URL)
  
  // Add query parameters
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, value.toString())
    }
  })

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${MBD_API_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`MBD API error: ${error}`)
  }

  return response.json()
} 