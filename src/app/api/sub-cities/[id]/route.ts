import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PUT /api/sub-cities/[id] — edit a sub-city
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const body = await req.json()
  const { name, region, active } = body

  const sc = await db.subCity.update({
    where: { id },
    data: { name, region, active },
  })
  return NextResponse.json(sc)
}

// DELETE /api/sub-cities/[id] — soft delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const sc = await db.subCity.update({ where: { id }, data: { active: false } })
  return NextResponse.json(sc)
}
