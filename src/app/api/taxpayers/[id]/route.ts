import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// GET /api/taxpayers/[id]
export async function GET(_req: NextRequest, { params }: Params) {
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

// PUT /api/taxpayers/[id]
export async function PUT(req: NextRequest, { params }: Params) {
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
    // block / unblock
    blocked,
    blockedReason,
    blockedByStaffId,
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

  if (blocked !== undefined) {
    data.blocked = blocked
    data.blockedReason = blocked ? blockedReason : null
    data.blockedAt = blocked ? new Date() : null
    data.blockedByStaffId = blocked ? blockedByStaffId : null
  }

  const tp = await db.taxPayer.update({
    where: { id },
    data,
    include: { woreda: true },
  })
  return NextResponse.json(tp)
}

// DELETE /api/taxpayers/[id]  (soft delete)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const tp = await db.taxPayer.update({
    where: { id },
    data: { active: false },
  })
  return NextResponse.json(tp)
}
