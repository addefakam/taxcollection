import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requireRole } from '@/lib/auth'
import { TAX_CATEGORIES } from '@/components/tax-system/lib'

// GET /api/income/targets?fiscalYear=2026/2027
// Any logged-in staff can view targets.
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const fiscalYear = searchParams.get('fiscalYear')

  const where: Record<string, unknown> = {}
  if (fiscalYear) where.fiscalYear = fiscalYear

  const targets = await db.yearlyTaxTarget.findMany({
    where,
    orderBy: [{ fiscalYear: 'asc' }, { category: 'asc' }],
    include: {
      setBy: { select: { id: true, fullName: true } },
    },
  })
  return NextResponse.json(targets)
}

// POST /api/income/targets  (Leader or City Admin)
// Body: { fiscalYear, category, expectedAmount, notes? }
// If a target for (fiscalYear, category) already exists, it's updated.
export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireRole('LEADER', 'CITY_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const body = await req.json()
  const { fiscalYear, category, expectedAmount, notes } = body

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

  // Upsert: create or update by (fiscalYear, category)
  const target = await db.yearlyTaxTarget.upsert({
    where: {
      fiscalYear_category: { fiscalYear, category },
    },
    update: {
      expectedAmount: amount,
      notes: notes ?? null,
      setByStaffId: user.id,
    },
    create: {
      fiscalYear,
      category,
      expectedAmount: amount,
      notes: notes ?? null,
      setByStaffId: user.id,
    },
    include: {
      setBy: { select: { id: true, fullName: true } },
    },
  })

  return NextResponse.json(target, { status: 201 })
}
