import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requireRole } from '@/lib/auth'
import { hashPassword, generateTempPassword } from '@/lib/password'

// GET /api/staff?role=...&active=true
// Any logged-in staff can see the list (needed for header dropdown).
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')
  const active = searchParams.get('active')

  const where: Record<string, unknown> = {}
  if (role) where.role = role
  if (active === 'true') where.active = true
  if (active === 'false') where.active = false

  const staff = await db.staff.findMany({
    where,
    orderBy: { fullName: 'asc' },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      // passwordHash intentionally NOT selected
    },
  })
  return NextResponse.json(staff)
}

// POST /api/staff  (Leader only — creates a new staff member, optionally with password)
// Body: { fullName, email, phone, role, password? }
export async function POST(req: NextRequest) {
  try {
    await requireRole('LEADER')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const body = await req.json()
  const { fullName, email, phone, role, password } = body

  if (!fullName || !email || !role) {
    return NextResponse.json(
      { error: 'fullName, email and role are required' },
      { status: 400 }
    )
  }
  if (!['LEADER', 'TEAM_1_ASSIGNMENT', 'TEAM_2_FINANCE', 'CITY_REVENUE_OFFICER'].includes(role)) {
    return NextResponse.json(
      { error: 'Invalid role. Must be LEADER, TEAM_1_ASSIGNMENT, TEAM_2_FINANCE, or CITY_REVENUE_OFFICER' },
      { status: 400 }
    )
  }

  const normalizedEmail = email.toLowerCase().trim()
  const existing = await db.staff.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  }

  let passwordHash: string | null = null
  let generatedPassword: string | null = null
  if (password) {
    passwordHash = await hashPassword(password)
  } else {
    generatedPassword = generateTempPassword()
    passwordHash = await hashPassword(generatedPassword)
  }

  const s = await db.staff.create({
    data: {
      fullName,
      email: normalizedEmail,
      phone: phone || null,
      role,
      passwordHash,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      active: true,
      createdAt: true,
    },
  })

  return NextResponse.json(
    { ...s, generatedPassword: generatedPassword || undefined },
    { status: 201 }
  )
}
