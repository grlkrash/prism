import { NextResponse } from 'next/server'
import { tokenDatabase } from '../../../utils/mbdAi'

export async function GET() {
  try {
    return NextResponse.json(tokenDatabase)
  } catch (error) {
    console.error('Error fetching tokens:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    )
  }
} 