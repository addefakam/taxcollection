import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/assignments/[id]/bank-receipt
// Team 2 (Finance team) records that the tax payer returned with a bank receipt
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const {
    bankName,
    bankReceiptNumber,
    paymentDate,
    paymentAmount,
    bankReceiptNote,
    performedBy,
    verifyOnly, // if true: just set status to VERIFIED (skip going back to BANK_RECEIPT_SUBMITTED)
  } = body

  const existing = await db.taxAssignment.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (existing.status === 'COMPLETED') {
    return NextResponse.json(
      { error: 'This assignment is already completed' },
      { status: 400 }
    )
  }

  const newStatus = verifyOnly ? 'VERIFIED' : 'BANK_RECEIPT_SUBMITTED'
  const fromStatus = existing.status

  const updated = await db.taxAssignment.update({
    where: { id },
    data: {
      bankName: bankName ?? existing.bankName,
      bankReceiptNumber: bankReceiptNumber ?? existing.bankReceiptNumber,
      paymentDate: paymentDate ? new Date(paymentDate) : existing.paymentDate,
      paymentAmount:
        paymentAmount !== undefined ? Number(paymentAmount) : existing.paymentAmount,
      bankReceiptNote: bankReceiptNote ?? existing.bankReceiptNote,
      bankReceiptReceivedBy: performedBy ?? existing.bankReceiptReceivedBy,
      bankReceiptReceivedAt: new Date(),
      status: newStatus,
    },
    include: { taxPayer: true },
  })

  await db.assignmentHistory.create({
    data: {
      assignmentId: id,
      action: verifyOnly ? 'VERIFY' : 'BANK_RECEIPT_RECEIVED',
      fromStatus,
      toStatus: newStatus,
      performedBy: performedBy || 'system',
      note: verifyOnly
        ? `Bank receipt verified (${bankReceiptNumber ?? existing.bankReceiptNumber}, ${bankName ?? existing.bankName})`
        : `Bank receipt received from tax payer (${bankReceiptNumber}, ${bankName}, ETB ${Number(paymentAmount ?? existing.paymentAmount).toLocaleString()})`,
    },
  })

  return NextResponse.json(updated)
}
