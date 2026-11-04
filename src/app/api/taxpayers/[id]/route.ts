import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requireRole } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// GET /api/taxpayers/[id]  (any logged-in staff)
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const tp = await db.taxPayer.findUnique({
    where: { id },
    include: {
      woreda: true,
      assignments: {
        orderBy: { createdAt: 'desc' },
        include: { assignedBy: { select: { id: true, fullName: true } } },
      },
    },
  })
  if (!tp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(tp)
}

// PUT /api/taxpayers/[id]  (Leader or Team 1)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER', 'TEAM_1_ASSIGNMENT')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const body = await req.json()
  const {
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
    active,
    tin,
  } = body

  const data: Record<string, unknown> = {
    fullName,
    category,
    phone,
    email,
    address,
    woredaId: woredaId === '' ? null : woredaId,
    kebele,
    tradeLicenseNo,
    contactPerson,
    notes,
    active,
    tin,
  }

  const tp = await db.taxPayer.update({
    where: { id },
    data,
    include: { woreda: true },
  })
  return NextResponse.json(tp)
}

// DELETE /api/taxpayers/[id]  (Leader or Team 1 — soft delete)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER', 'TEAM_1_ASSIGNMENT')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const tp = await db.taxPayer.update({
    where: { id },
    data: { active: false },
  })
  return NextResponse.json(tp)
}
