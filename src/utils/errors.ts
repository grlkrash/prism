export class BaseError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = this.constructor.name
    this.code = code
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string) {
    super(message, 'RATE_LIMIT_EXCEEDED')
  }
}

export class ValidationError extends BaseError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR')
  }
}

export class ApiError extends BaseError {
  constructor(message: string) {
    super(message, 'API_ERROR')
  }
}

export class AuthError extends BaseError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR')
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string) {
    super(message, 'NOT_FOUND')
  }
}

export class FarcasterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FarcasterError'
  }
} 