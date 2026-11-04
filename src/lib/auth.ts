import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { db } from './db'

const SESSION_COOKIE = 'bf_session'
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  'bishoftu-finance-dev-secret-change-in-production-min-32-chars'

const secretKey = new TextEncoder().encode(SESSION_SECRET)

export type Role = 'LEADER' | 'TEAM_1_ASSIGNMENT' | 'TEAM_2_FINANCE' | 'CITY_REVENUE_OFFICER'

export interface SessionUser {
  id: string
  fullName: string
  email: string
  role: Role
}

export interface SessionPayload extends SessionUser {
  // JWT standard fields
  iat?: number
  exp?: number
}

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8 // 8 hours

/** Sign a JWT and set it as an httpOnly cookie */
export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })

  // Also record last login time
  try {
    await db.staff.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })
  } catch {
    // ignore
  }
}

/** Clear the session cookie (logout) */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

/** Read the current session from the cookie. Returns null if not logged in. */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null

    const { payload } = await jwtVerify(token, secretKey)
    return {
      id: payload.id as string,
      fullName: payload.fullName as string,
      email: payload.email as string,
      role: payload.role as Role,
    }
  } catch {
    return null
  }
}

/** Require an authenticated session. Throws 401 if missing. */
export async function requireSession(): Promise<SessionUser> {
  const user = await getSession()
  if (!user) {
    throw new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return user
}

/** Require an authenticated session with one of the given roles. Throws 403 if not allowed. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireSession()
  if (!roles.includes(user.role)) {
    throw new Response(
      JSON.stringify({
        error: `Forbidden: requires one of ${roles.join(', ')}`,
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
  return user
}
