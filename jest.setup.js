import '@testing-library/jest-dom'
import { Readable } from 'stream'

// Add TextEncoder polyfill
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Add ReadableStream polyfill
class MockReadableStream {
  constructor(options) {
    this._options = options
  }

  getReader() {
    const stream = new Readable()
    this._options.start({
      enqueue: (chunk) => stream.push(chunk),
      close: () => stream.push(null)
    })
    return {
      read: () => new Promise((resolve) => {
        stream.once('readable', () => {
          const chunk = stream.read()
          resolve(chunk ? { value: chunk, done: false } : { done: true })
        })
      }),
      releaseLock: () => {}
    }
  }
}
global.ReadableStream = MockReadableStream

// Mock fetch globally
global.fetch = jest.fn((url, options) => {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(JSON.parse(options?.body || '{}')),
    text: () => Promise.resolve(options?.body || ''),
    headers: new Headers(),
  })
})

// Mock environment variables
process.env = {
  ...process.env,
  OPENAI_API_KEY: 'test-api-key',
  MBD_API_KEY: 'test-mbd-key',
  MBD_AI_API_URL: 'https://api.example.com',
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-key'
}

// Mock Request and Response
global.Request = class Request {
  constructor(input, init) {
    this.input = input
    this.init = init
  }
}

class Response {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status || 200
    this.ok = init.status ? init.status >= 200 && init.status < 300 : true
    this.headers = new Headers(init.headers)
  }

  json() {
    return Promise.resolve(
      typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    )
  }

  text() {
    return Promise.resolve(
      typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    )
  }
}

global.Response = Response

// Mock process.exit
const originalProcessExit = process.exit
process.exit = (code) => {
  console.log(`Process.exit called with code ${code}`)
  return undefined
} 