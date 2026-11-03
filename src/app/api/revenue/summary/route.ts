import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  fiscalYearRange,
  getAvailableFiscalYears,
  classifyByCategory,
  CATEGORY_LABELS,
} from '@/lib/revenue'

// GET /api/revenue/summary?fiscalYear=2026/2027
// Returns the city-wide revenue summary:
//  - expected (yearly target per category, summed)
//  - collected (sum of paymentAmount for COMPLETED assignments in the fiscal year)
//  - outstanding (expected - collected)
//  - counts of completed / pending assignments
//  - by-category breakdown: { expected, collected, outstanding, count }
//  - recent daily/weekly/monthly collection totals
// Any logged-in staff can view (most useful for City Revenue Officer + Leader).
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const availableFYs = await getAvailableFiscalYears()
  const fiscalYear =
    searchParams.get('fiscalYear') || availableFYs[0] || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`

  const range = fiscalYearRange(fiscalYear)
  if (!range) {
    return NextResponse.json({ error: 'Invalid fiscalYear' }, { status: 400 })
  }

  const now = new Date()
  const fyEnd = range.end < now ? range.end : now

  // 1. All COMPLETED assignments within fiscal year (collected)
  const [completed, allAssigned, targets] = await Promise.all([
    db.taxAssignment.findMany({
      where: {
        status: 'COMPLETED',
        paymentDate: { gte: range.start, lt: range.end },
      },
      select: {
        id: true,
        amountDue: true,
        paymentAmount: true,
        paymentDate: true,
        taxType: true,
        taxPayer: { select: { category: true, woredaId: true } },
      },
    }),
    db.taxAssignment.findMany({
      where: {
        status: { not: 'CANCELLED' },
        assignedAt: { gte: range.start, lt: range.end },
      },
      select: {
        id: true,
        amountDue: true,
        paymentAmount: true,
        paymentDate: true,
        status: true,
        taxType: true,
        taxPayer: { select: { category: true } },
      },
    }),
    db.yearlyTaxTarget.findMany({
      where: { fiscalYear, woredaId: null }, // city-wide targets only
    }),
  ])

  // ---- Aggregate by category ----
  const byCategoryMap = new Map<
    string,
    { expected: number; collected: number; assignedAmount: number; collectedCount: number; assignedCount: number }
  >()

  // Seed with all known categories so the UI shows zeros for missing ones
  const allCategories = Array.from(
    new Set([
      ...Object.keys(CATEGORY_LABELS).filter((k) => k !== 'OTHER'),
      ...completed.map((a) => classifyByCategory(a)),
      ...allAssigned.map((a) => classifyByCategory(a)),
      ...targets.map((t) => t.category),
    ])
  )

  for (const cat of allCategories) {
    byCategoryMap.set(cat, {
      expected: 0,
      collected: 0,
      assignedAmount: 0,
      collectedCount: 0,
      assignedCount: 0,
    })
  }

  // Add expected from targets
  for (const t of targets) {
    const c = byCategoryMap.get(t.category) || {
      expected: 0,
      collected: 0,
      assignedAmount: 0,
      collectedCount: 0,
      assignedCount: 0,
    }
    c.expected += t.expectedAmount
    byCategoryMap.set(t.category, c)
  }

  // Add assigned amount
  for (const a of allAssigned) {
    const cat = classifyByCategory(a)
    const c = byCategoryMap.get(cat) || byCategoryMap.get('OTHER') || {
      expected: 0,
      collected: 0,
      assignedAmount: 0,
      collectedCount: 0,
      assignedCount: 0,
    }
    c.assignedAmount += a.amountDue || 0
    c.assignedCount += 1
    byCategoryMap.set(cat, c)
  }

  // Add collected
  for (const a of completed) {
    const cat = classifyByCategory(a)
    const c = byCategoryMap.get(cat) || byCategoryMap.get('OTHER') || {
      expected: 0,
      collected: 0,
      assignedAmount: 0,
      collectedCount: 0,
      assignedCount: 0,
    }
    c.collected += a.paymentAmount || 0
    c.collectedCount += 1
    byCategoryMap.set(cat, c)
  }

  const byCategory = Array.from(byCategoryMap.entries())
    .map(([category, v]) => ({
      category,
      label: CATEGORY_LABELS[category] || category,
      expected: v.expected,
      collected: v.collected,
      outstanding: Math.max(0, v.expected - v.collected),
      assignedAmount: v.assignedAmount,
      assignedCount: v.assignedCount,
      collectedCount: v.collectedCount,
      collectionRate: v.expected > 0 ? Math.round((v.collected / v.expected) * 100) : 0,
    }))
    .sort((a, b) => b.collected - a.collected)

  // ---- Totals ----
  const totalExpected = byCategory.reduce((s, c) => s + c.expected, 0)
  const totalCollected = byCategory.reduce((s, c) => s + c.collected, 0)
  const totalOutstanding = Math.max(0, totalExpected - totalCollected)
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0

  // ---- Daily/weekly/monthly totals for the fiscal year so far ----
  const dailyTotals = computeDailyTotals(completed, range.start, fyEnd)
  const weeklyTotals = computeWeeklyTotals(completed, range.start, fyEnd)
  const monthlyTotals = computeMonthlyTotals(completed, range.start, fyEnd)

  // ---- Today / this week / this month / this year ----
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const weekStart = startOfWeek(now)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const periodTotals = {
    today: sumCollectedIn(completed, todayStart, now),
    thisWeek: sumCollectedIn(completed, weekStart, now),
    thisMonth: sumCollectedIn(completed, monthStart, now),
    thisYear: sumCollectedIn(completed, range.start, now),
  }

  // ---- Counts ----
  const counts = {
    completed: completed.length,
    pending: allAssigned.filter((a) => a.status !== 'COMPLETED').length,
    totalAssigned: allAssigned.length,
  }

  return NextResponse.json({
    fiscalYear,
    availableFiscalYears: availableFYs,
    rangeStart: range.start,
    rangeEnd: range.end,
    totals: {
      expected: totalExpected,
      collected: totalCollected,
      outstanding: totalOutstanding,
      collectionRate,
    },
    counts,
    periodTotals,
    byCategory,
    daily: dailyTotals,
    weekly: weeklyTotals,
    monthly: monthlyTotals,
    currentUser: user,
  })
}

function sumCollectedIn(
  list: Array<{ paymentAmount: number | null; paymentDate: Date | null }>,
  start: Date,
  end: Date
): number {
  return list
    .filter((a) => a.paymentDate && a.paymentDate >= start && a.paymentDate < end)
    .reduce((s, a) => s + (a.paymentAmount || 0), 0)
}

function startOfWeek(d: Date): Date {
  const out = new Date(d)
  const day = out.getDay() // 0 = Sunday
  const diff = (day + 1) % 7 // make Monday the start of the week
  out.setDate(out.getDate() - diff)
  out.setHours(0, 0, 0, 0)
  return out
}

function computeDailyTotals(
  completed: Array<{ paymentAmount: number | null; paymentDate: Date | null }>,
  start: Date,
  end: Date
): Array<{ date: string; total: number; count: number }> {
  const map = new Map<string, { total: number; count: number }>()
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    if (!map.has(key)) map.set(key, { total: 0, count: 0 })
  }
  for (const a of completed) {
    if (!a.paymentDate) continue
    const key = a.paymentDate.toISOString().slice(0, 10)
    const cur = map.get(key) || { total: 0, count: 0 }
    cur.total += a.paymentAmount || 0
    cur.count += 1
    map.set(key, cur)
  }
  return Array.from(map.entries())
    .map(([date, v]) => ({ date, total: v.total, count: v.count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

function computeWeeklyTotals(
  completed: Array<{ paymentAmount: number | null; paymentDate: Date | null }>,
  start: Date,
  end: Date
): Array<{ weekStart: string; total: number; count: number }> {
  const map = new Map<string, { total: number; count: number }>()
  // Pre-seed weeks from start to end
  const cursor = startOfWeek(start)
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10)
    if (!map.has(key)) map.set(key, { total: 0, count: 0 })
    cursor.setDate(cursor.getDate() + 7)
  }
  for (const a of completed) {
    if (!a.paymentDate) continue
    const ws = startOfWeek(a.paymentDate)
    const key = ws.toISOString().slice(0, 10)
    const cur = map.get(key) || { total: 0, count: 0 }
    cur.total += a.paymentAmount || 0
    cur.count += 1
    map.set(key, cur)
  }
  return Array.from(map.entries())
    .map(([weekStart, v]) => ({ weekStart, total: v.total, count: v.count }))
    .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))
}

function computeMonthlyTotals(
  completed: Array<{ paymentAmount: number | null; paymentDate: Date | null }>,
  start: Date,
  end: Date
): Array<{ month: string; total: number; count: number }> {
  const map = new Map<string, { total: number; count: number }>()
  // Pre-seed months from start to end
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, { total: 0, count: 0 })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  for (const a of completed) {
    if (!a.paymentDate) continue
    const key = `${a.paymentDate.getFullYear()}-${String(a.paymentDate.getMonth() + 1).padStart(2, '0')}`
    const cur = map.get(key) || { total: 0, count: 0 }
    cur.total += a.paymentAmount || 0
    cur.count += 1
    map.set(key, cur)
  }
  return Array.from(map.entries())
    .map(([month, v]) => ({ month, total: v.total, count: v.count }))
    .sort((a, b) => (a.month < b.month ? -1 : 1))
}
