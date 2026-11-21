import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PUT /api/woredas/[id]  (Leader, System Admin, City Admin, SubCity Admin)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN', 'SUBCITY_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const body = await req.json()
  const { name, region, active, subCityId } = body
  const w = await db.woreda.update({
    where: { id },
    data: {
      name,
      region,
      active,
      subCityId: subCityId === '' ? null : subCityId,
    },
    include: { subCity: true },
  })
  return NextResponse.json(w)
}

// DELETE /api/woredas/[id]  (Leader, System Admin, City Admin)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const w = await db.woreda.delete({ where: { id } })
  return NextResponse.json(w)
}
