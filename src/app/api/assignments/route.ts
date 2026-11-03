import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/assignments?status=...&q=...&taxPayerId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || ''
  const q = searchParams.get('q')?.trim() || ''
  const taxPayerId = searchParams.get('taxPayerId') || ''
  const fiscalYear = searchParams.get('fiscalYear') || ''

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (taxPayerId) where.taxPayerId = taxPayerId
  if (fiscalYear) where.fiscalYear = fiscalYear
  if (q) {
    where.OR = [
      { referenceNo: { contains: q } },
      { taxPayer: { tin: { contains: q } } },
      { taxPayer: { fullName: { contains: q } } },
      { bankReceiptNumber: { contains: q } },
      { governmentReceiptNumber: { contains: q } },
    ]
  }

  const assignments = await db.taxAssignment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { taxPayer: true },
  })
  return NextResponse.json(assignments)
}

// POST /api/assignments  (Team 1 creates a new tax assignment)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    taxPayerId,
    fiscalYear,
    period,
    taxType,
    description,
    amountDue,
    assignedBy,
    dueDate,
  } = body

  if (!taxPayerId || !fiscalYear || !period || !taxType || !amountDue || !assignedBy) {
    return NextResponse.json(
      { error: 'taxPayerId, fiscalYear, period, taxType, amountDue, assignedBy are required' },
      { status: 400 }
    )
  }

  // generate reference number BF-YYYY-XXXX
  const year = new Date().getFullYear()
  const count = await db.taxAssignment.count({
    where: { referenceNo: { startsWith: `BF-${year}-` } },
  })
  const referenceNo = `BF-${year}-${String(count + 1).padStart(4, '0')}`

  const assignment = await db.taxAssignment.create({
    data: {
      referenceNo,
      taxPayerId,
      fiscalYear,
      period,
      taxType,
      description,
      amountDue: Number(amountDue),
      assignedBy,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'ASSIGNED',
    },
    include: { taxPayer: true },
  })

  // record history
  await db.assignmentHistory.create({
    data: {
      assignmentId: assignment.id,
      action: 'ASSIGN',
      toStatus: 'ASSIGNED',
      performedBy: assignedBy,
      note: `Tax of ETB ${Number(amountDue).toLocaleString()} (${taxType}, ${fiscalYear} ${period}) assigned to ${assignment.taxPayer.fullName}`,
    },
  })

  return NextResponse.json(assignment, { status: 201 })
}
