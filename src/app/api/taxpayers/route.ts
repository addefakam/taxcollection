import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requireRole } from '@/lib/auth'

// GET /api/taxpayers?q=...&category=...&active=...&woredaId=...&blocked=...
// Any logged-in staff can view. DATA_COLLECTOR only sees their assigned woreda.
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''
  const category = searchParams.get('category') || ''
  const active = searchParams.get('active')
  const woredaId = searchParams.get('woredaId') || ''
  const blocked = searchParams.get('blocked')

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [
      { tin: { contains: q } },
      { fullName: { contains: q } },
      { phone: { contains: q } },
      { tradeLicenseNo: { contains: q } },
    ]
  }
  if (category) where.category = category
  if (active === 'true') where.active = true
  if (active === 'false') where.active = false
  if (blocked === 'true') where.blocked = true
  if (blocked === 'false') where.blocked = false

  // Enforce woreda-scoped data for DATA_COLLECTOR
  if (user.role === 'DATA_COLLECTOR') {
    if (!user.assignedWoredaId) {
      return NextResponse.json(
        { error: 'Your account is not assigned to any woreda. Contact the Leader.' },
        { status: 403 }
      )
    }
    where.woredaId = user.assignedWoredaId
  } else if (woredaId) {
    where.woredaId = woredaId
  }

  const taxpayers = await db.taxPayer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      woreda: true,
      _count: { select: { assignments: true } },
    },
  })
  return NextResponse.json(taxpayers)
}

// POST /api/taxpayers  (Leader or Team 1; DATA_COLLECTOR can also create but only in their woreda)
export async function POST(req: NextRequest) {
  try {
    await requireRole('LEADER', 'TEAM_1_ASSIGNMENT', 'DATA_COLLECTOR')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const user = await getSession()
  const body = await req.json()
  const {
    tin,
    fullName,
    category,
    phone,
    email,
    address,
    woredaId: bodyWoredaId,
    kebele,
    tradeLicenseNo,
    contactPerson,
    notes,
  } = body

  if (!tin || !fullName || !category) {
    return NextResponse.json(
      { error: 'tin, fullName and category are required' },
      { status: 400 }
    )
  }

  // For DATA_COLLECTOR: force woredaId to be their assigned woreda (ignore body value)
  // For Leader/Team 1: use the body value, or null if not provided
  let woredaId: string | null
  if (user?.role === 'DATA_COLLECTOR') {
    if (!user.assignedWoredaId) {
      return NextResponse.json(
        { error: 'Your account is not assigned to any woreda. Contact the Leader.' },
        { status: 403 }
      )
    }
    woredaId = user.assignedWoredaId
  } else {
    woredaId = bodyWoredaId || null
  }

  const exists = await db.taxPayer.findUnique({ where: { tin } })
  if (exists) {
    return NextResponse.json(
      { error: `Tax payer with TIN ${tin} already exists` },
      { status: 409 }
    )
  }

  const tp = await db.taxPayer.create({
    data: {
      tin,
      fullName,
      category,
      phone,
      email,
      address,
      woredaId,
      kebele,
      tradeLicenseNo,
      contactPerson,
      notes,
    },
    include: { woreda: true },
  })
  return NextResponse.json(tp, { status: 201 })
}
