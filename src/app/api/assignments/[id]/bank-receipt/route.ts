import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/assignments/[id]/bank-receipt  (Leader or Team 2)
// Records that the tax payer returned with a bank receipt.
// Optional: attachments array of { fileName, mimeType, content (base64), fileSize }
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
  const {
    bankName,
    bankReceiptNumber,
    paymentDate,
    paymentAmount,
    bankReceiptNote,
    attachments,
  } = body

  const existing = await db.taxAssignment.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (existing.status === 'COMPLETED') {
    return NextResponse.json(
      { error: 'This assignment is already completed' },
      { status: 400 }
    )
  }

  const fromStatus = existing.status
  const newStatus = 'BANK_RECEIPT_SUBMITTED'

  const updated = await db.taxAssignment.update({
    where: { id },
    data: {
      bankName: bankName ?? existing.bankName,
      bankReceiptNumber: bankReceiptNumber ?? existing.bankReceiptNumber,
      paymentDate: paymentDate ? new Date(paymentDate) : existing.paymentDate,
      paymentAmount:
        paymentAmount !== undefined ? Number(paymentAmount) : existing.paymentAmount,
      bankReceiptNote: bankReceiptNote ?? existing.bankReceiptNote,
      bankReceiptReceivedByStaffId: user.id,
      bankReceiptReceivedByName: user.fullName,
      bankReceiptReceivedAt: new Date(),
      status: newStatus,
    },
    include: { taxPayer: true },
  })

  // Save attachments if provided
  if (Array.isArray(attachments) && attachments.length > 0) {
    for (const att of attachments) {
      await db.bankReceiptAttachment.create({
        data: {
          assignmentId: id,
          fileName: att.fileName,
          mimeType: att.mimeType,
          fileSize: att.fileSize,
          content: att.content, // base64
          uploadedByStaffId: user.id,
        },
      })
    }
  }

  await db.assignmentHistory.create({
    data: {
      assignmentId: id,
      action: 'BANK_RECEIPT_RECEIVED',
      fromStatus,
      toStatus: newStatus,
      performedByStaffId: user.id,
      performedByName: user.fullName,
      note:
        `Bank receipt received from tax payer (${bankReceiptNumber}, ${bankName}, ETB ${Number(paymentAmount ?? existing.paymentAmount).toLocaleString()})` +
        (attachments && attachments.length > 0 ? ` + ${attachments.length} attachment(s)` : ''),
    },
  })

  return NextResponse.json(updated)
}
