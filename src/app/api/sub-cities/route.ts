import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requireRole } from '@/lib/auth'

// GET /api/sub-cities — list all sub-cities with their woredas
export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const subCities = await db.subCity.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { woredas: true } },
      woredas: {
        orderBy: { name: 'asc' },
        select: {
          id: true,
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
  const { name, region } = body

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const exists = await db.subCity.findUnique({ where: { name } })
  if (exists) {
    return NextResponse.json({ error: `Sub-City "${name}" already exists` }, { status: 409 })
  }

  const sc = await db.subCity.create({ data: { name, region } })
  return NextResponse.json(sc, { status: 201 })
}
