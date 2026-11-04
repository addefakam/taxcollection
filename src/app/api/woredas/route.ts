import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requireRole } from '@/lib/auth'

// GET /api/woredas  (any logged-in staff)
export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const woredas = await db.woreda.findMany({
    orderBy: { code: 'asc' },
    include: { _count: { select: { taxPayers: true } } },
  })
  return NextResponse.json(woredas)
}

// POST /api/woredas  (Leader only)
export async function POST(req: NextRequest) {
  try {
    await requireRole('LEADER')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const body = await req.json()
  const { code, name, region } = body
  if (!code || !name) {
    return NextResponse.json({ error: 'code and name are required' }, { status: 400 })
  }
  const exists = await db.woreda.findUnique({ where: { code } })
  if (exists) {
    return NextResponse.json({ error: `Woreda ${code} already exists` }, { status: 409 })
  }
  const w = await db.woreda.create({ data: { code, name, region } })
  return NextResponse.json(w, { status: 201 })
}
