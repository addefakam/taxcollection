import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/woredas
export async function GET() {
  const woredas = await db.woreda.findMany({
    orderBy: { code: 'asc' },
    include: { _count: { select: { taxPayers: true } } },
  })
  return NextResponse.json(woredas)
}

// POST /api/woredas
export async function POST(req: NextRequest) {
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
