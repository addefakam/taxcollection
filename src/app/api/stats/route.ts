import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/stats - leader dashboard summary  (any logged-in staff)
// DATA_COLLECTOR: stats are scoped to their assigned woreda
export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Common where clause: filter by woreda for DATA_COLLECTOR
  let woredaFilter: Record<string, unknown> = {}
  if (user.role === 'DATA_COLLECTOR') {
    if (!user.assignedWoredaId) {
      return NextResponse.json(
        { error: 'Your account is not assigned to any woreda. Contact the Leader.' },
        { status: 403 }
      )
    }
    woredaFilter = { woredaId: user.assignedWoredaId }
  }

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
    db.taxPayer.count({ where: woredaFilter }),
    db.taxPayer.count({ where: { ...woredaFilter, active: true } }),
    db.taxPayer.count({ where: { ...woredaFilter, blocked: true } }),
    db.staff.count({ where: { active: true } }),
    db.taxAssignment.count({
      where: { status: 'ASSIGNED', taxPayer: woredaFilter },
    }),
    db.taxAssignment.count({
      where: { status: 'BANK_RECEIPT_SUBMITTED', taxPayer: woredaFilter },
    }),
    db.taxAssignment.count({
      where: { status: 'COMPLETED', taxPayer: woredaFilter },
    }),
    db.taxAssignment.count({
      where: { status: 'CANCELLED', taxPayer: woredaFilter },
    }),
    db.taxAssignment.count({
      where: { disputed: true, taxPayer: woredaFilter },
    }),
    db.taxAssignment.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      where: { taxPayer: woredaFilter },
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

  // Total amounts (filtered by woreda for DATA_COLLECTOR)
  const allAssignments = await db.taxAssignment.findMany({
    where: { status: { not: 'CANCELLED' }, taxPayer: woredaFilter },
    select: { amountDue: true, paymentAmount: true, status: true },
  })

  const totalAssignedAmount = allAssignments.reduce(
    (sum, a) => sum + (a.amountDue || 0),
    0
  )
  const totalCollected = allAssignments
    .filter((a) => a.status === 'COMPLETED')
    .reduce((sum, a) => sum + (a.paymentAmount || 0), 0)

  // Counts by category (filtered)
  const byCategoryRaw = await db.taxPayer.groupBy({
    by: ['category'],
    _count: true,
    where: woredaFilter,
  })
  const byCategory = byCategoryRaw.map((c) => ({
    category: c.category,
    count: c._count,
  }))

  // Counts by tax type (filtered)
  const byTaxTypeRaw = await db.taxAssignment.groupBy({
    by: ['taxType'],
    _count: true,
    where: { status: { not: 'CANCELLED' }, taxPayer: woredaFilter },
  })
  const byTaxType = byTaxTypeRaw.map((c) => ({
    taxType: c.taxType,
    count: c._count,
  }))

  // Counts by woreda (skip for DATA_COLLECTOR — only their woreda)
  const byWoreda: { woredaId: string | null; woredaName: string; count: number }[] = []
  if (user.role !== 'DATA_COLLECTOR') {
    const byWoredaRaw = await db.taxPayer.groupBy({
      by: ['woredaId'],
      _count: true,
    })
    const woredaIds = byWoredaRaw.map((w) => w.woredaId).filter(Boolean) as string[]
    const woredas = await db.woreda.findMany({ where: { id: { in: woredaIds } } })
    const woredaMap = new Map(woredas.map((w) => [w.id, w]))
    byWoreda.push(
      ...byWoredaRaw.map((w) => ({
        woredaId: w.woredaId,
        woredaName: w.woredaId ? woredaMap.get(w.woredaId)?.name || 'Unknown' : 'Unassigned',
        count: w._count,
      }))
    )
  } else {
    // Just show the collector's woreda
    byWoreda.push({
      woredaId: user.assignedWoredaId,
      woredaName: user.assignedWoredaName || 'Your Woreda',
      count: totalTaxPayers,
    })
  }

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
    woredaScoped: user.role === 'DATA_COLLECTOR',
  })
}
