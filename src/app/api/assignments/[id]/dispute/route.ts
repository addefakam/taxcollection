import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/assignments/[id]/dispute
// Body: { disputed: true/false, disputeReason: string, performedByStaffId, performedByName }
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const { disputed, disputeReason, performedByStaffId, performedByName } = body

  const existing = await db.taxAssignment.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Look up staff name
  let staffName = performedByName
  if (!staffName && performedByStaffId) {
    const s = await db.staff.findUnique({ where: { id: performedByStaffId } })
    if (s) staffName = s.fullName
  }
  if (!staffName) staffName = 'Unknown'

  const updated = await db.taxAssignment.update({
    where: { id },
    data: {
      disputed: !!disputed,
      disputeReason: disputed ? (disputeReason || null) : null,
      disputedAt: disputed ? new Date() : null,
      disputedByStaffId: disputed ? (performedByStaffId || null) : null,
    },
    include: { taxPayer: true },
  })

  await db.assignmentHistory.create({
    data: {
      assignmentId: id,
      action: disputed ? 'DISPUTE' : 'UNDISPUTE',
      fromStatus: existing.status,
      toStatus: existing.status,
      performedByStaffId: performedByStaffId || null,
      performedByName: staffName,
      note: disputed
        ? `Marked as disputed: ${disputeReason || 'no reason given'}`
        : 'Dispute resolved / cleared',
    },
  })

  return NextResponse.json(updated)
}
