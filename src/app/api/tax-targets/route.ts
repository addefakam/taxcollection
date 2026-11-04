import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requireRole } from '@/lib/auth'
import { TAX_CATEGORIES } from '@/components/tax-system/lib'

// GET /api/tax-targets?fiscalYear=...
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
    include: { woreda: true, setBy: { select: { id: true, fullName: true } } },
    orderBy: [{ fiscalYear: 'desc' }, { woredaId: 'asc' }, { category: 'asc' }],
  })
  return NextResponse.json({ targets, currentUser: user })
}

// POST /api/tax-targets  (Leader only)
// Body: { fiscalYear, woredaId (nullable), category, expectedAmount, notes? }
export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireRole('LEADER')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const body = await req.json()
  const { fiscalYear, woredaId, category, expectedAmount, notes } = body

  if (!fiscalYear || !category || expectedAmount === undefined) {
    return NextResponse.json(
      { error: 'fiscalYear, category, and expectedAmount are required' },
      { status: 400 }
    )
  }
  if (!TAX_CATEGORIES.some((c) => c.value === category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${TAX_CATEGORIES.map((c) => c.value).join(', ')}` },
      { status: 400 }
    )
  }

  // Upsert: one target per (fiscalYear, woredaId, category)
  const effectiveWoredaId = woredaId || null
  const existing = await db.yearlyTaxTarget.findUnique({
    where: {
      fiscalYear_woredaId_category: {
        fiscalYear,
        woredaId: effectiveWoredaId as string | null,
        category,
      },
    },
  })

  let target
  if (existing) {
    target = await db.yearlyTaxTarget.update({
      where: { id: existing.id },
      data: {
        expectedAmount: Number(expectedAmount),
        notes: notes || null,
        setByStaffId: user.id,
      },
      include: { woreda: true },
    })
  } else {
    target = await db.yearlyTaxTarget.create({
      data: {
        fiscalYear,
        woredaId: effectiveWoredaId,
        category,
        expectedAmount: Number(expectedAmount),
        notes: notes || null,
        setByStaffId: user.id,
      },
      include: { woreda: true },
    })
  }

  return NextResponse.json({ target, currentUser: user }, { status: 201 })
}
