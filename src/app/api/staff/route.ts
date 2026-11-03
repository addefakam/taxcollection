import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/staff?role=...&active=true
export async function GET(req: NextRequest) {
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
  })
  return NextResponse.json(staff)
}

// POST /api/staff
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { fullName, email, phone, role } = body
  if (!fullName || !role) {
    return NextResponse.json({ error: 'fullName and role are required' }, { status: 400 })
  }
  if (email) {
    const existing = await db.staff.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }
  }
  const s = await db.staff.create({
    data: { fullName, email: email || null, phone: phone || null, role },
  })
  return NextResponse.json(s, { status: 201 })
}
