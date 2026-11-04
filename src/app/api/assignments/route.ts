import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requireRole } from '@/lib/auth'

// GET /api/assignments?status=...&q=...&taxPayerId=...&disputed=...
// Any logged-in staff can view.
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || ''
  const q = searchParams.get('q')?.trim() || ''
  const taxPayerId = searchParams.get('taxPayerId') || ''
  const fiscalYear = searchParams.get('fiscalYear') || ''
  const disputed = searchParams.get('disputed')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (taxPayerId) where.taxPayerId = taxPayerId
  if (fiscalYear) where.fiscalYear = fiscalYear
  if (disputed === 'true') where.disputed = true
  if (disputed === 'false') where.disputed = false
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
    include: {
      taxPayer: { include: { woreda: true } },
      assignedBy: { select: { id: true, fullName: true, role: true } },
      bankReceiptReceivedBy: { select: { id: true, fullName: true } },
      governmentReceiptIssuedBy: { select: { id: true, fullName: true } },
    },
  })
  return NextResponse.json(assignments)
}

// POST /api/assignments  (Leader or Team 1)
export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireRole('LEADER', 'TEAM_1_ASSIGNMENT')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const body = await req.json()
  const {
    taxPayerId,
    fiscalYear,
    period,
    taxType,
    description,
    amountDue,
    dueDate,
  } = body

  if (!taxPayerId || !fiscalYear || !period || !taxType || !amountDue) {
    return NextResponse.json(
      { error: 'taxPayerId, fiscalYear, period, taxType, amountDue are required' },
      { status: 400 }
    )
  }

  // Check tax payer is not blocked
  const tp = await db.taxPayer.findUnique({ where: { id: taxPayerId } })
  if (!tp) return NextResponse.json({ error: 'Tax payer not found' }, { status: 404 })
  if (tp.blocked) {
    return NextResponse.json(
      { error: `Tax payer ${tp.fullName} is blocked: ${tp.blockedReason || 'no reason given'}` },
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
      assignedByStaffId: user.id,
      assignedByName: user.fullName,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'ASSIGNED',
    },
    include: {
      taxPayer: { include: { woreda: true } },
      assignedBy: { select: { id: true, fullName: true, role: true } },
    },
  })

  await db.assignmentHistory.create({
    data: {
      assignmentId: assignment.id,
      action: 'ASSIGN',
      toStatus: 'ASSIGNED',
      performedByStaffId: user.id,
      performedByName: user.fullName,
      note: `Tax of ETB ${Number(amountDue).toLocaleString()} (${taxType}, ${fiscalYear} ${period}) assigned to ${assignment.taxPayer.fullName}`,
    },
  })

  return NextResponse.json(assignment, { status: 201 })
}
