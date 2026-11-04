import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/stats - leader dashboard summary  (any logged-in staff)
export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const [
    totalTaxPayers,
    activeTaxPayers,
    blockedTaxPayers,
    totalStaff,
    assigned,
    bankReceiptSubmitted,
    completed,
    cancelled,
    disputed,
    recentAssignments,
    recentHistory,
  ] = await Promise.all([
    db.taxPayer.count(),
    db.taxPayer.count({ where: { active: true } }),
    db.taxPayer.count({ where: { blocked: true } }),
    db.staff.count({ where: { active: true } }),
    db.taxAssignment.count({ where: { status: 'ASSIGNED' } }),
    db.taxAssignment.count({ where: { status: 'BANK_RECEIPT_SUBMITTED' } }),
    db.taxAssignment.count({ where: { status: 'COMPLETED' } }),
    db.taxAssignment.count({ where: { status: 'CANCELLED' } }),
    db.taxAssignment.count({ where: { disputed: true } }),
    db.taxAssignment.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        taxPayer: true,
        assignedBy: { select: { id: true, fullName: true } },
      },
    }),
    db.assignmentHistory.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: { assignment: { include: { taxPayer: true } } },
    }),
  ])

  // Total amounts
  const allAssignments = await db.taxAssignment.findMany({
    where: { status: { not: 'CANCELLED' } },
    select: { amountDue: true, paymentAmount: true, status: true },
  })

  const totalAssignedAmount = allAssignments.reduce(
    (sum, a) => sum + (a.amountDue || 0),
    0
  )
  const totalCollected = allAssignments
    .filter((a) => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + (a.paymentAmount || 0), 0)

  // Counts by category
  const byCategoryRaw = await db.taxPayer.groupBy({
    by: ['category'],
    _count: true,
  })
  const byCategory = byCategoryRaw.map((c) => ({
    category: c.category,
    count: c._count,
  }))

  // Counts by tax type
  const byTaxTypeRaw = await db.taxAssignment.groupBy({
    by: ['taxType'],
    _count: true,
    where: { status: { not: 'CANCELLED' } },
  })
  const byTaxType = byTaxTypeRaw.map((c) => ({
    taxType: c.taxType,
    count: c._count,
  }))

  // Counts by woreda
  const byWoredaRaw = await db.taxPayer.groupBy({
    by: ['woredaId'],
    _count: true,
  })

  const woredaIds = byWoredaRaw.map((w) => w.woredaId).filter(Boolean) as string[]
  const woredas = await db.woreda.findMany({ where: { id: { in: woredaIds } } })
  const woredaMap = new Map(woredas.map((w) => [w.id, w]))
  const byWoreda = byWoredaRaw.map((w) => ({
    woredaId: w.woredaId,
    woredaName: w.woredaId ? woredaMap.get(w.woredaId)?.name || 'Unknown' : 'Unassigned',
    count: w._count,
  }))

  return NextResponse.json({
    counts: {
      totalTaxPayers,
      activeTaxPayers,
      blockedTaxPayers,
      totalStaff,
      assigned,
      bankReceiptSubmitted,
      completed,
      cancelled,
      disputed,
      totalAssignments: assigned + bankReceiptSubmitted + completed,
    },
    amounts: {
      totalAssignedAmount,
      totalCollected,
      outstanding: totalAssignedAmount - totalCollected,
    },
    byCategory,
    byTaxType,
    byWoreda,
    recentAssignments,
    recentHistory,
    currentUser: user,
  })
}
