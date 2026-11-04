import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PUT /api/woredas/[id]  (Leader only)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const body = await req.json()
  const { code, name, region, active } = body
  const w = await db.woreda.update({
    where: { id },
    data: { code, name, region, active },
  })
  return NextResponse.json(w)
}

// DELETE /api/woredas/[id]  (Leader only — soft delete)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const w = await db.woreda.update({ where: { id }, data: { active: false } })
  return NextResponse.json(w)
}
