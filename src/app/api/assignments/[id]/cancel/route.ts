import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/assignments/[id]/cancel
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const { reason, performedByStaffId, performedByName } = body

  const existing = await db.taxAssignment.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (existing.status === 'COMPLETED') {
    return NextResponse.json(
      { error: 'Cannot cancel a completed assignment' },
      { status: 400 }
    )
  }

  // Look up staff name
  let staffName = performedByName
  if (!staffName && performedByStaffId) {
    const s = await db.staff.findUnique({ where: { id: performedByStaffId } })
    if (s) staffName = s.fullName
  }
  if (!staffName) staffName = 'Unknown'

  const fromStatus = existing.status
  const updated = await db.taxAssignment.update({
    where: { id },
    data: { status: 'CANCELLED', notes: reason },
    include: { taxPayer: true },
  })

  await db.assignmentHistory.create({
    data: {
      assignmentId: id,
      action: 'CANCEL',
      fromStatus,
      toStatus: 'CANCELLED',
      performedByStaffId: performedByStaffId || null,
      performedByName: staffName,
      note: reason || 'Assignment cancelled',
    },
  })

  return NextResponse.json(updated)
}
