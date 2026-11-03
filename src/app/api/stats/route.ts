import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/stats - leader dashboard summary
export async function GET() {
  const [
    totalTaxPayers,
    activeTaxPayers,
    assigned,
    bankReceiptSubmitted,
    completed,
    cancelled,
    recentAssignments,
    recentHistory,
  ] = await Promise.all([
    db.taxPayer.count(),
    db.taxPayer.count({ where: { active: true } }),
    db.taxAssignment.count({ where: { status: 'ASSIGNED' } }),
    db.taxAssignment.count({ where: { status: 'BANK_RECEIPT_SUBMITTED' } }),
    db.taxAssignment.count({ where: { status: 'COMPLETED' } }),
    db.taxAssignment.count({ where: { status: 'CANCELLED' } }),
    db.taxAssignment.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: { taxPayer: true },
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

  // Counts by tax type (assignments)
  const byTaxTypeRaw = await db.taxAssignment.groupBy({
    by: ['taxType'],
    _count: true,
    where: { status: { not: 'CANCELLED' } },
  })
  const byTaxType = byTaxTypeRaw.map((c) => ({
    taxType: c.taxType,
    count: c._count,
  }))

  return NextResponse.json({
    counts: {
      totalTaxPayers,
      activeTaxPayers,
      assigned,
      bankReceiptSubmitted,
      completed,
      cancelled,
      totalAssignments: assigned + bankReceiptSubmitted + completed,
    },
    amounts: {
      totalAssignedAmount,
      totalCollected,
      outstanding: totalAssignedAmount - totalCollected,
    },
    byCategory,
    byTaxType,
    recentAssignments,
    recentHistory,
  })
}
