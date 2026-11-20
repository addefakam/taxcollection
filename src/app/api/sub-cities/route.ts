import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requireRole } from '@/lib/auth'

// GET /api/sub-cities — list all sub-cities with their woredas
// Any logged-in staff can view.
export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const subCities = await db.subCity.findMany({
    orderBy: { code: 'asc' },
    include: {
      _count: { select: { woredas: true } },
      woredas: {
        orderBy: { code: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          active: true,
          _count: { select: { taxPayers: true } },
        },
      },
    },
  })
  return NextResponse.json(subCities)
}

// POST /api/sub-cities — create a new sub-city (Leader or System Admin)
export async function POST(req: NextRequest) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const body = await req.json()
  const { code, name, region } = body

  if (!code || !name) {
    return NextResponse.json({ error: 'code and name are required' }, { status: 400 })
  }

  const exists = await db.subCity.findUnique({ where: { code } })
  if (exists) {
    return NextResponse.json({ error: `Sub-City with code ${code} already exists` }, { status: 409 })
  }

  const sc = await db.subCity.create({ data: { code, name, region } })
  return NextResponse.json(sc, { status: 201 })
}
