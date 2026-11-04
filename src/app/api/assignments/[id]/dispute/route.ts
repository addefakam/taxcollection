import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/assignments/[id]/dispute  (Leader only)
// Body: { disputed: true/false, disputeReason: string }
export async function PATCH(req: NextRequest, { params }: Params) {
  let user
  try {
    user = await requireRole('LEADER')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const body = await req.json()
  const { disputed, disputeReason } = body

  const existing = await db.taxAssignment.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.taxAssignment.update({
    where: { id },
    data: {
      disputed: !!disputed,
      disputeReason: disputed ? (disputeReason || null) : null,
      disputedAt: disputed ? new Date() : null,
      disputedByStaffId: disputed ? user.id : null,
    },
    include: { taxPayer: true },
  })

  await db.assignmentHistory.create({
    data: {
      assignmentId: id,
      action: disputed ? 'DISPUTE' : 'UNDISPUTE',
      fromStatus: existing.status,
      toStatus: existing.status,
      performedByStaffId: user.id,
      performedByName: user.fullName,
      note: disputed
        ? `Marked as disputed: ${disputeReason || 'no reason given'}`
        : 'Dispute resolved / cleared',
    },
  })

  return NextResponse.json(updated)
}
