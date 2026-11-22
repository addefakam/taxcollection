import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PUT /api/teams/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN', 'SUBCITY_ADMIN', 'WOREDA_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const body = await req.json()
  const { name, description, woredaId, subCityId, leadStaffId, active } = body

  const t = await db.team.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(woredaId !== undefined && { woredaId: woredaId || null }),
      ...(subCityId !== undefined && { subCityId: subCityId || null }),
      ...(leadStaffId !== undefined && { leadStaffId: leadStaffId || null }),
      ...(active !== undefined && { active }),
    },
    include: { lead: { select: { id: true, fullName: true } }, woreda: { select: { name: true } }, subCity: { select: { name: true } } },
  })
  return NextResponse.json(t)
}

// DELETE /api/teams/[id] — soft delete
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN', 'SUBCITY_ADMIN', 'WOREDA_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const t = await db.team.delete({ where: { id } })
  return NextResponse.json({ ok: true, deleted: true })
}
