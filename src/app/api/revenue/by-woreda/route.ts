import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { fiscalYearRange, getAvailableFiscalYears, classifyByCategory } from '@/lib/revenue'

// GET /api/revenue/by-woreda?fiscalYear=2026/2027
// Returns collection summary per woreda for the given fiscal year
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const availableFYs = await getAvailableFiscalYears()
  const fiscalYear =
    searchParams.get('fiscalYear') || availableFYs[0] || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`

  const range = fiscalYearRange(fiscalYear)
  if (!range) return NextResponse.json({ error: 'Invalid fiscalYear' }, { status: 400 })

  const [completed, targets, woredas] = await Promise.all([
    db.taxAssignment.findMany({
      where: {
        status: 'COMPLETED',
        paymentDate: { gte: range.start, lt: range.end },
      },
      select: {
        id: true,
        paymentAmount: true,
        paymentDate: true,
        taxType: true,
        taxPayer: {
          select: {
            id: true,
            tin: true,
            fullName: true,
            category: true,
            woredaId: true,
          },
        },
      },
    }),
    db.yearlyTaxTarget.findMany({ where: { fiscalYear } }),
    db.woreda.findMany({ where: { active: true }, orderBy: { code: 'asc' } }),
  ])

  // Build per-woreda map
  const byWoreda = new Map<
    string,
    {
      woredaId: string
      woredaName: string
      woredaCode: string
      expected: number
      collected: number
      collectedCount: number
      byCategory: Record<string, number>
    }
  >()

  for (const w of woredas) {
    byWoreda.set(w.id, {
      woredaId: w.id,
      woredaName: w.name,
      woredaCode: w.code,
      expected: 0,
      collected: 0,
      collectedCount: 0,
      byCategory: {},
    })
  }

  // Add "Unassigned" bucket
  byWoreda.set('__none__', {
    woredaId: '__none__',
    woredaName: 'Unassigned Woreda',
    woredaCode: '—',
    expected: 0,
    collected: 0,
    collectedCount: 0,
    byCategory: {},
  })

  // Apply targets
  for (const t of targets) {
    const key = t.woredaId || '__none__'
    const w = byWoreda.get(key)
    if (w) w.expected += t.expectedAmount
  }

  // Apply collected
  for (const a of completed) {
    const key = a.taxPayer?.woredaId || '__none__'
    const w = byWoreda.get(key)
    if (!w) continue
    w.collected += a.paymentAmount || 0
    w.collectedCount += 1
    const cat = classifyByCategory(a)
    w.byCategory[cat] = (w.byCategory[cat] || 0) + (a.paymentAmount || 0)
  }

  const out = Array.from(byWoreda.values())
    .filter((w) => w.woredaId !== '__none__' || w.collectedCount > 0 || w.expected > 0)
    .map((w) => ({
      ...w,
      outstanding: Math.max(0, w.expected - w.collected),
      collectionRate: w.expected > 0 ? Math.round((w.collected / w.expected) * 100) : 0,
    }))
    .sort((a, b) => b.collected - a.collected)

  return NextResponse.json({
    fiscalYear,
    availableFiscalYears: availableFYs,
    byWoreda: out,
    currentUser: user,
  })
}
