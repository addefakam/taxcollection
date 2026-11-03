import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requireRole } from '@/lib/auth'
import { TAX_CATEGORIES } from '@/components/tax-system/lib'

// GET /api/income/targets?fiscalYear=2026/2027&woredaId=...
// Any logged-in staff can view targets.
// If woredaId is not provided, returns ALL targets for the fiscal year (city-wide + per-woreda).
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const fiscalYear = searchParams.get('fiscalYear')
  const woredaId = searchParams.get('woredaId')

  const where: Record<string, unknown> = {}
  if (fiscalYear) where.fiscalYear = fiscalYear
  if (woredaId === 'null') where.woredaId = null
  else if (woredaId) where.woredaId = woredaId

  const targets = await db.yearlyTaxTarget.findMany({
    where,
    orderBy: [{ fiscalYear: 'asc' }, { woredaId: 'asc' }, { category: 'asc' }],
    include: {
      setBy: { select: { id: true, fullName: true } },
      woreda: { select: { id: true, code: true, name: true } },
    },
  })
  return NextResponse.json(targets)
}

// POST /api/income/targets  (Leader or City Admin)
// Body: { fiscalYear, category, expectedAmount, woredaId?, notes? }
// woredaId null/undefined = city-wide target.
// If a target for (fiscalYear, woredaId, category) already exists, it's updated.
export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireRole('LEADER', 'CITY_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const body = await req.json()
  const { fiscalYear, category, expectedAmount, woredaId, notes } = body

  if (!fiscalYear || !category || expectedAmount === undefined) {
    return NextResponse.json(
      { error: 'fiscalYear, category and expectedAmount are required' },
      { status: 400 }
    )
  }
  if (!TAX_CATEGORIES.some((c) => c.value === category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${TAX_CATEGORIES.map((c) => c.value).join(', ')}` },
      { status: 400 }
    )
  }
  const amount = Number(expectedAmount)
  if (isNaN(amount) || amount < 0) {
    return NextResponse.json(
      { error: 'expectedAmount must be a non-negative number' },
      { status: 400 }
    )
  }

  // If woredaId provided, validate it exists
  const finalWoredaId = woredaId || null
  if (finalWoredaId) {
    const w = await db.woreda.findUnique({ where: { id: finalWoredaId } })
    if (!w) {
      return NextResponse.json({ error: 'Woreda not found' }, { status: 404 })
    }
  }

  // Upsert: create or update by (fiscalYear, woredaId, category)
  // Prisma's @@unique on (fiscalYear, woredaId, category) creates a compound key.
  // For nullable woredaId, we use a manual lookup then upsert.
  const existing = await db.yearlyTaxTarget.findFirst({
    where: {
      fiscalYear,
      woredaId: finalWoredaId,
      category,
    },
  })

  let target
  if (existing) {
    target = await db.yearlyTaxTarget.update({
      where: { id: existing.id },
      data: {
        expectedAmount: amount,
        notes: notes ?? null,
        setByStaffId: user.id,
      },
      include: {
        setBy: { select: { id: true, fullName: true } },
        woreda: { select: { id: true, code: true, name: true } },
      },
    })
  } else {
    target = await db.yearlyTaxTarget.create({
      data: {
        fiscalYear,
        woredaId: finalWoredaId,
        category,
        expectedAmount: amount,
        notes: notes ?? null,
        setByStaffId: user.id,
      },
      include: {
        setBy: { select: { id: true, fullName: true } },
        woreda: { select: { id: true, code: true, name: true } },
      },
    })
  }

  return NextResponse.json(target, { status: 201 })
}
