import '@testing-library/jest-dom'

// Mock fetch globally
global.fetch = jest.fn()

// Mock environment variables
process.env.MBD_API_KEY = 'mbd-test-key'
process.env.MBD_AI_API_URL = 'https://api.mbd.xyz/v2'
process.env.NEXT_PUBLIC_FARCASTER_API_URL = 'https://api.warpcast.com'

// Mock Request and Response
global.Request = class Request {
  constructor(input, init) {
    this.input = input
    this.init = init
  }
}

global.Response = class Response {
  constructor(body, init) {
    this.body = body
    this.init = init
    this.ok = true
    this.status = 200
  }

  json() {
    return Promise.resolve(JSON.parse(this.body))
  }
}

// Mock process.exit
const originalProcessExit = process.exit
process.exit = (code) => {
  console.log(`Process.exit called with code ${code}`)
  return undefined
} 