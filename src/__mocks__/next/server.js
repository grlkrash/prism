export class NextRequest extends Request {
  constructor(input, init) {
    super(input, init)
  }
}

export class NextResponse extends Response {
  constructor(body, init) {
    super(body, init)
  }

  static json(data, init) {
    const body = JSON.stringify(data)
    return new NextResponse(body, {
      ...init,
      headers: {
        ...init?.headers,
        'content-type': 'application/json',
      },
    })
  }
} 