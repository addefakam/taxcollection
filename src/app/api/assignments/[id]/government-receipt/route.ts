import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/assignments/[id]/government-receipt
// Team 2 issues the official government receipt - final step
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const {
    governmentReceiptNumber,
    governmentReceiptNote,
    performedByStaffId,
    performedByName,
  } = body

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

  // Look up staff name
  let staffName = performedByName
  if (!staffName && performedByStaffId) {
    const s = await db.staff.findUnique({ where: { id: performedByStaffId } })
    if (s) staffName = s.fullName
  }
  if (!staffName) staffName = 'Unknown'

  // Auto-generate government receipt number if not provided
  const receiptNo =
    governmentReceiptNumber ||
    `GR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`

  const fromStatus = existing.status
  const updated = await db.taxAssignment.update({
    where: { id },
    data: {
      governmentReceiptNumber: receiptNo,
      governmentReceiptIssuedByStaffId: performedByStaffId || null,
      governmentReceiptIssuedByName: staffName,
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
      performedByStaffId: performedByStaffId || null,
      performedByName: staffName,
      note: `Government receipt ${receiptNo} issued to ${updated.taxPayer.fullName}. Process completed.`,
    },
  })

  return NextResponse.json(updated)
}
