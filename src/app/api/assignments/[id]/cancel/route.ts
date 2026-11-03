import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/assignments/[id]/cancel
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const { reason, performedBy } = body

  const existing = await db.taxAssignment.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (existing.status === 'COMPLETED') {
    return NextResponse.json(
      { error: 'Cannot cancel a completed assignment' },
      { status: 400 }
    )
  }

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
      performedBy: performedBy || 'system',
      note: reason || 'Assignment cancelled',
    },
  })

  return NextResponse.json(updated)
}
