import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

// GET /api/auth/me - returns the currently logged in user, or 401
export async function GET() {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  return NextResponse.json({ user })
}
