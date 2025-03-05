import { MBD_AI_CONFIG } from '@/config/mbdAi'

interface MBDRequestOptions {
  limit?: number
  offset?: number
  [key: string]: any
}

export async function fetchFromMBD(endpoint: string, options: MBDRequestOptions = {}) {
  const url = new URL(endpoint, MBD_AI_CONFIG.API_URL)
  
  // Add query parameters
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.append(key, value.toString())
    }
  })

  const response = await fetch(url.toString(), {
    headers: MBD_AI_CONFIG.getHeaders()
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`MBD API error: ${error}`)
  }

  return response.json()
} 