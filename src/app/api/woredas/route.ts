import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requireRole } from '@/lib/auth'

// GET /api/woredas  (any logged-in staff)
// Optional query param: subCityId=xxx to filter by sub-city
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const subCityId = searchParams.get('subCityId')

  const where: Record<string, unknown> = {}
  if (subCityId) where.subCityId = subCityId

  const woredas = await db.woreda.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      subCity: { select: { id: true, name: true } },
      _count: { select: { taxPayers: true } },
    },
  })
  return NextResponse.json(woredas)
}

// POST /api/woredas  (Leader or System Admin)
// Body: { name, region?, subCityId? }
export async function POST(req: NextRequest) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const body = await req.json()
  const { name, region, subCityId } = body
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  const exists = await db.woreda.findUnique({ where: { name } })
  if (exists) {
    return NextResponse.json({ error: `Woreda "${name}" already exists` }, { status: 409 })
  }

  // Validate subCityId if provided
  if (subCityId) {
    const sc = await db.subCity.findUnique({ where: { id: subCityId } })
    if (!sc) {
      return NextResponse.json({ error: 'Sub-City not found' }, { status: 400 })
    }
  }

  const w = await db.woreda.create({
    data: { name, region, subCityId: subCityId || null },
    include: { subCity: true },
  })
  return NextResponse.json(w, { status: 201 })
}
