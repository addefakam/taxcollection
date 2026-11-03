import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { TAX_CATEGORIES, categoryLabel } from '@/components/tax-system/lib'

// GET /api/income/summary?fiscalYear=2026/2027
// Returns city-wide income analytics:
//   - For each category: expected, assigned, collected, outstanding, collection rate, counts
//   - Totals across all categories
//   - Daily/weekly/monthly collected breakdown for the current fiscal year
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  // Default to current Ethiopian-style fiscal year (July 8 to July 7 next year)
  const now = new Date()
  const defaultFiscalYear =
    now.getMonth() >= 6 // July (0-indexed) onward
      ? `${now.getFullYear()}/${now.getFullYear() + 1}`
      : `${now.getFullYear() - 1}/${now.getFullYear()}`
  const fiscalYear = searchParams.get('fiscalYear') || defaultFiscalYear

  // 1. Get all targets for this fiscal year
  const targets = await db.yearlyTaxTarget.findMany({
    where: { fiscalYear },
    include: { setBy: { select: { fullName: true } } },
  })
  const targetByCat = new Map(targets.map((t) => [t.category, t]))

  // 2. Get all assignments for this fiscal year (excluding cancelled)
  const assignments = await db.taxAssignment.findMany({
    where: {
      fiscalYear,
      status: { not: 'CANCELLED' },
    },
    select: {
      id: true,
      status: true,
      amountDue: true,
      paymentAmount: true,
      disputed: true,
      paymentDate: true,
      governmentReceiptIssuedAt: true,
      taxPayer: { select: { category: true } },
    },
  })

  // 3. Per-category summary
  const byCategory = TAX_CATEGORIES.map((c) => {
    const catAssignments = assignments.filter(
      (a) => a.taxPayer.category === c.value
    )
    const target = targetByCat.get(c.value)
    const expected = target?.expectedAmount || 0
    const assigned = catAssignments.reduce((s, a) => s + (a.amountDue || 0), 0)
    const collected = catAssignments
      .filter((a) => a.status === 'COMPLETED')
      .reduce((s, a) => s + (a.paymentAmount || 0), 0)
    const pending = catAssignments
      .filter((a) => a.status === 'BANK_RECEIPT_SUBMITTED')
      .reduce((s, a) => s + (a.paymentAmount || 0), 0)
    const outstanding = assigned - collected - pending
    const assignedCount = catAssignments.length
    const completedCount = catAssignments.filter((a) => a.status === 'COMPLETED').length
    const disputedCount = catAssignments.filter((a) => a.disputed).length
    // Use expected as base if set, otherwise use assigned
    const baseForRate = expected > 0 ? expected : assigned
    const collectionRate = baseForRate > 0 ? Math.round((collected / baseForRate) * 100) : 0

    return {
      category: c.value,
      categoryLabel: categoryLabel(c.value),
      expected,
      hasTarget: !!target,
      targetSetBy: target?.setBy?.fullName || null,
      targetSetAt: target?.updatedAt || null,
      assigned,
      collected,
      pendingBankReceipt: pending,
      outstanding: outstanding < 0 ? 0 : outstanding,
      collectionRate,
      assignedCount,
      completedCount,
      disputedCount,
    }
  })

  // 4. Totals
  const totals = byCategory.reduce(
    (acc, c) => ({
      expected: acc.expected + c.expected,
      assigned: acc.assigned + c.assigned,
      collected: acc.collected + c.collected,
      pendingBankReceipt: acc.pendingBankReceipt + c.pendingBankReceipt,
      outstanding: acc.outstanding + c.outstanding,
      assignedCount: acc.assignedCount + c.assignedCount,
      completedCount: acc.completedCount + c.completedCount,
      disputedCount: acc.disputedCount + c.disputedCount,
    }),
    {
      expected: 0,
      assigned: 0,
      collected: 0,
      pendingBankReceipt: 0,
      outstanding: 0,
      assignedCount: 0,
      completedCount: 0,
      disputedCount: 0,
    }
  )
  const overallCollectionRate =
    totals.expected > 0
      ? Math.round((totals.collected / totals.expected) * 100)
      : totals.assigned > 0
        ? Math.round((totals.collected / totals.assigned) * 100)
        : 0

  // 5. Daily/weekly/monthly collected (based on governmentReceiptIssuedAt)
  const completedAssignments = assignments.filter(
    (a) => a.status === 'COMPLETED' && a.governmentReceiptIssuedAt
  )

  const byDay = new Map<string, number>()
  const byWeek = new Map<string, number>()
  const byMonth = new Map<string, number>()

  for (const a of completedAssignments) {
    const d = new Date(a.governmentReceiptIssuedAt as Date)
    const dayKey = d.toISOString().split('T')[0] // YYYY-MM-DD
    byDay.set(dayKey, (byDay.get(dayKey) || 0) + (a.paymentAmount || 0))

    // ISO week number
    const tmp = new Date(d.valueOf())
    tmp.setHours(0, 0, 0, 0)
    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7))
    const week1 = new Date(tmp.getFullYear(), 0, 4)
    const weekNo =
      1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
    const weekKey = `${tmp.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
    byWeek.set(weekKey, (byWeek.get(weekKey) || 0) + (a.paymentAmount || 0))

    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    byMonth.set(monthKey, (byMonth.get(monthKey) || 0) + (a.paymentAmount || 0))
  }

  const daily = Array.from(byDay.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const weekly = Array.from(byWeek.entries())
    .map(([week, amount]) => ({ week, amount }))
    .sort((a, b) => a.week.localeCompare(b.week))

  const monthly = Array.from(byMonth.entries())
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // 6. Available fiscal years for the filter dropdown
  const allFiscalYears = await db.taxAssignment.findMany({
    where: {},
    select: { fiscalYear: true },
    distinct: ['fiscalYear'],
    orderBy: { fiscalYear: 'asc' },
  })
  const targetFiscalYears = await db.yearlyTaxTarget.findMany({
    select: { fiscalYear: true },
    distinct: ['fiscalYear'],
    orderBy: { fiscalYear: 'asc' },
  })
  const availableFiscalYears = Array.from(
    new Set([
      ...allFiscalYears.map((f) => f.fiscalYear),
      ...targetFiscalYears.map((f) => f.fiscalYear),
      defaultFiscalYear,
    ])
  ).sort()

  return NextResponse.json({
    fiscalYear,
    availableFiscalYears,
    byCategory,
    totals: {
      ...totals,
      overallCollectionRate,
    },
    trends: {
      daily,
      weekly,
      monthly,
    },
    currentUser: user,
  })
}
