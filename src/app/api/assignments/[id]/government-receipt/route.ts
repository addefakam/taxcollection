import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/assignments/[id]/government-receipt  (Leader or Team 2)
// Team 2 issues the official government receipt - final step
// If assignment is disputed, only Leader can issue.
export async function PATCH(req: NextRequest, { params }: Params) {
  let user
  try {
    user = await requireRole('LEADER', 'TEAM_2_FINANCE')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const body = await req.json()
  const { governmentReceiptNumber, governmentReceiptNote } = body

  const existing = await db.taxAssignment.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!existing.bankReceiptNumber && !existing.governmentReceiptNumber) {
    return NextResponse.json(
      { error: 'Bank receipt must be recorded before issuing government receipt' },
      { status: 400 }
    )
  }
  if (existing.status === 'COMPLETED') {
    return NextResponse.json(
      { error: 'Government receipt already issued' },
      { status: 400 }
    )
  }

  // If disputed, only Leader can issue
  if (existing.disputed && user.role !== 'LEADER') {
    return NextResponse.json(
      {
        error:
          'This assignment is marked as disputed. Only the Finance Leader can issue the government receipt.',
      },
      { status: 403 }
    )
  }

  // Auto-generate government receipt number if not provided
  const receiptNo =
    governmentReceiptNumber ||
    `GR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`

  const fromStatus = existing.status
  const updated = await db.taxAssignment.update({
    where: { id },
    data: {
      governmentReceiptNumber: receiptNo,
      governmentReceiptIssuedByStaffId: user.id,
      governmentReceiptIssuedByName: user.fullName,
      governmentReceiptIssuedAt: new Date(),
      governmentReceiptNote: governmentReceiptNote,
      status: 'COMPLETED',
    },
    include: { taxPayer: true },
  })

  await db.assignmentHistory.create({
    data: {
      assignmentId: id,
      action: 'ISSUE_GOVERNMENT_RECEIPT',
      fromStatus,
      toStatus: 'COMPLETED',
      performedByStaffId: user.id,
      performedByName: user.fullName,
      note: `Government receipt ${receiptNo} issued to ${updated.taxPayer.fullName}. Process completed.`,
    },
  })

  return NextResponse.json(updated)
}
