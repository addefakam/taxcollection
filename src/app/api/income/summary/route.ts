import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { TAX_CATEGORIES, categoryLabel } from '@/components/tax-system/lib'

// GET /api/income/summary?fiscalYear=2026/2027
// Returns city-wide income analytics:
//   - For each category: expected, assigned, collected, outstanding, collection rate, counts
//   - Totals across all categories
//   - Daily/weekly/monthly/yearly collected breakdown for the fiscal year
//   - By woreda: expected, collected, outstanding per woreda
//   - Top 10 taxpayers by total paid
//   - Recent 10 completed payments
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

  // 1. Get all targets for this fiscal year (city-wide + per-woreda)
  const targets = await db.yearlyTaxTarget.findMany({
    where: { fiscalYear },
    include: {
      setBy: { select: { fullName: true } },
      woreda: { select: { id: true, code: true, name: true } },
    },
  })
  // City-wide targets (woredaId = null)
  const targetByCat = new Map(
    targets.filter((t) => !t.woredaId).map((t) => [t.category, t])
  )
  // Per-woreda targets
  const targetByWoredaCat = new Map<string, (typeof targets)[number]>()
  for (const t of targets) {
    if (t.woredaId) {
      targetByWoredaCat.set(`${t.woredaId}:${t.category}`, t)
    }
  }

  // 2. Get all assignments for this fiscal year (excluding cancelled)
  const assignments = await db.taxAssignment.findMany({
    where: {
      fiscalYear,
      status: { not: 'CANCELLED' },
    },
    select: {
      id: true,
      referenceNo: true,
      status: true,
      amountDue: true,
      paymentAmount: true,
      disputed: true,
      paymentDate: true,
      bankReceiptNumber: true,
      bankName: true,
      governmentReceiptNumber: true,
      governmentReceiptIssuedAt: true,
      governmentReceiptIssuedByName: true,
      taxType: true,
      period: true,
      taxPayer: {
        select: {
          id: true,
          tin: true,
          fullName: true,
          category: true,
          woredaId: true,
          woreda: { select: { id: true, code: true, name: true } },
        },
      },
    },
  })

  // 3. Per-category summary (uses city-wide target OR sums per-woreda targets)
  const byCategory = TAX_CATEGORIES.map((c) => {
    const catAssignments = assignments.filter(
      (a) => a.taxPayer.category === c.value
    )
    const target = targetByCat.get(c.value)
    // If no city-wide target, sum all per-woreda targets for this category
    const woredaTargets = targets.filter(
      (t) => t.woredaId && t.category === c.value
    )
    const expectedFromWoredaSum = woredaTargets.reduce(
      (s, t) => s + t.expectedAmount,
      0
    )
    const expected = target?.expectedAmount || expectedFromWoredaSum || 0
    const hasTarget = !!target || woredaTargets.length > 0
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
    const baseForRate = expected > 0 ? expected : assigned
    const collectionRate = baseForRate > 0 ? Math.round((collected / baseForRate) * 100) : 0

    return {
      category: c.value,
      categoryLabel: categoryLabel(c.value),
      expected,
      hasTarget,
      hasCityWideTarget: !!target,
      hasWoredaTargets: woredaTargets.length > 0,
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

  // 5. Daily/weekly/monthly/yearly collected (based on governmentReceiptIssuedAt)
  const completedAssignments = assignments.filter(
    (a) => a.status === 'COMPLETED' && a.governmentReceiptIssuedAt
  )

  const byDay = new Map<string, number>()
  const byWeek = new Map<string, number>()
  const byMonth = new Map<string, number>()
  const byYear = new Map<string, number>()

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

    const yearKey = String(d.getFullYear())
    byYear.set(yearKey, (byYear.get(yearKey) || 0) + (a.paymentAmount || 0))
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

  const yearly = Array.from(byYear.entries())
    .map(([year, amount]) => ({ year, amount }))
    .sort((a, b) => a.year.localeCompare(b.year))

  // 6. By woreda: collected/expected/outstanding per woreda
  const woredas = await db.woreda.findMany({ where: { active: true } })
  const byWoreda = woredas.map((w) => {
    const woredaAssignments = assignments.filter(
      (a) => a.taxPayer.woredaId === w.id
    )
    // Sum per-woreda targets across all categories for this woreda
    const woredaTargetsForThisWoreda = targets.filter(
      (t) => t.woredaId === w.id
    )
    const expected = woredaTargetsForThisWoreda.reduce(
      (s, t) => s + t.expectedAmount,
      0
    )
    const collected = woredaAssignments
      .filter((a) => a.status === 'COMPLETED')
      .reduce((s, a) => s + (a.paymentAmount || 0), 0)
    const assigned = woredaAssignments.reduce((s, a) => s + (a.amountDue || 0), 0)
    const outstanding = assigned - collected
    const completedCount = woredaAssignments.filter((a) => a.status === 'COMPLETED').length
    const assignedCount = woredaAssignments.length
    const rate =
      expected > 0
        ? Math.round((collected / expected) * 100)
        : assigned > 0
          ? Math.round((collected / assigned) * 100)
          : 0
    return {
      woredaId: w.id,
      woredaCode: w.code,
      woredaName: w.name,
      expected,
      collected,
      assigned,
      outstanding: outstanding < 0 ? 0 : outstanding,
      rate,
      assignedCount,
      completedCount,
    }
  })

  // 7. Top 10 taxpayers by total collected
  const taxpayerTotals = new Map<string, {
    taxPayer: (typeof completedAssignments)[number]['taxPayer']
    totalPaid: number
    caseCount: number
  }>()
  for (const a of completedAssignments) {
    const key = a.taxPayer.id
    const existing = taxpayerTotals.get(key)
    if (existing) {
      existing.totalPaid += a.paymentAmount || 0
      existing.caseCount += 1
    } else {
      taxpayerTotals.set(key, {
        taxPayer: a.taxPayer,
        totalPaid: a.paymentAmount || 0,
        caseCount: 1,
      })
    }
  }
  const topTaxpayers = Array.from(taxpayerTotals.values())
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .slice(0, 10)
    .map((t) => ({
      taxPayerId: t.taxPayer.id,
      tin: t.taxPayer.tin,
      fullName: t.taxPayer.fullName,
      category: t.taxPayer.category,
      categoryLabel: categoryLabel(t.taxPayer.category),
      woreda: t.taxPayer.woreda,
      totalPaid: t.totalPaid,
      caseCount: t.caseCount,
    }))

  // 8. Recent 10 completed payments
  const recentPayments = completedAssignments
    .slice()
    .sort((a, b) => {
      const ta = new Date(a.governmentReceiptIssuedAt as Date).getTime()
      const tb = new Date(b.governmentReceiptIssuedAt as Date).getTime()
      return tb - ta
    })
    .slice(0, 10)
    .map((a) => ({
      id: a.id,
      referenceNo: a.referenceNo,
      taxPayerTin: a.taxPayer.tin,
      taxPayerName: a.taxPayer.fullName,
      category: a.taxPayer.category,
      categoryLabel: categoryLabel(a.taxPayer.category),
      taxType: a.taxType,
      period: a.period,
      paymentAmount: a.paymentAmount,
      bankName: a.bankName,
      bankReceiptNumber: a.bankReceiptNumber,
      governmentReceiptNumber: a.governmentReceiptNumber,
      governmentReceiptIssuedAt: a.governmentReceiptIssuedAt,
      governmentReceiptIssuedByName: a.governmentReceiptIssuedByName,
    }))

  // 9. Available fiscal years for the filter dropdown
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

  // 10. Per-woreda + per-category target matrix (for setting targets UI)
  const woredaCategoryTargets = woredas.map((w) => {
    const cats: Record<string, number> = {}
    for (const c of TAX_CATEGORIES) {
      const t = targetByWoredaCat.get(`${w.id}:${c.value}`)
      cats[c.value] = t?.expectedAmount || 0
    }
    return {
      woredaId: w.id,
      woredaCode: w.code,
      woredaName: w.name,
      targets: cats,
    }
  })

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
      yearly,
    },
    byWoreda,
    topTaxpayers,
    recentPayments,
    woredaCategoryTargets,
    currentUser: user,
  })
}
