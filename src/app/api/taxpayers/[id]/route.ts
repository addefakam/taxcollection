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

// PUT /api/taxpayers/[id]  (Leader, System Admin, Team 1, or Data Collector)
// Data Collector can only edit taxpayers in their assigned woreda and cannot move them to another woreda.
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN', 'TEAM_1_ASSIGNMENT', 'DATA_COLLECTOR')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const user = await getSession()
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

  // For DATA_COLLECTOR: enforce that the taxpayer belongs to their woreda
  // and force woredaId to remain their woreda (cannot move to another woreda).
  let finalWoredaId: string | null = woredaId === '' ? null : woredaId
  if (user?.role === 'DATA_COLLECTOR') {
    if (!user.assignedWoredaId) {
      return NextResponse.json(
        { error: 'Your account is not assigned to any woreda. Contact the Leader.' },
        { status: 403 }
      )
    }
    // Verify the existing taxpayer is in their woreda
    const existing = await db.taxPayer.findUnique({
      where: { id },
      select: { woredaId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Tax payer not found' }, { status: 404 })
    }
    if (existing.woredaId !== user.assignedWoredaId) {
      return NextResponse.json(
        { error: 'You can only edit tax payers in your assigned woreda.' },
        { status: 403 }
      )
    }
    // Force woredaId to their woreda — Data Collector cannot reassign
    finalWoredaId = user.assignedWoredaId
  }

  const data: Record<string, unknown> = {
    fullName,
    category,
    phone,
    email,
    address,
    woredaId: finalWoredaId,
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

// DELETE /api/taxpayers/[id]  (Leader, System Admin, or Team 1 — soft delete)
// Data Collector cannot delete (BLOCK_TAXPAYER permission is false for them).
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN', 'TEAM_1_ASSIGNMENT')
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
