import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PUT /api/tax-targets/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN', 'SUBCITY_ADMIN', 'WOREDA_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const body = await req.json()
  const { expectedAmount, notes, name } = body

  if (expectedAmount === undefined) {
    return NextResponse.json({ error: 'expectedAmount is required' }, { status: 400 })
  }

  const t = await db.yearlyTaxTarget.update({
    where: { id },
    data: { expectedAmount: Number(expectedAmount), notes: notes || null, name: name ?? undefined },
    include: { woreda: { select: { name: true } }, subCity: { select: { name: true } }, team: { select: { name: true } } },
  })
  return NextResponse.json(t)
}

// DELETE /api/tax-targets/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN', 'SUBCITY_ADMIN', 'WOREDA_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params

  // Get the target to check ownership
  const target = await db.yearlyTaxTarget.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Enforce hierarchical scoping:
  // SUBCITY_ADMIN can only delete targets within their sub-city
  // WOREDA_ADMIN can only delete targets within their woreda
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  if (user.role === 'SUBCITY_ADMIN') {
    // Check if target belongs to their sub-city
    const belongsToSubCity =
      target.subCityId === user.assignedSubCityId ||
      (target.woredaId ? await db.woreda.findUnique({
        where: { id: target.woredaId },
        select: { subCityId: true },
      }).then(w => w?.subCityId === user.assignedSubCityId) : false)
    if (!belongsToSubCity) {
      return NextResponse.json({ error: 'You can only delete targets within your sub-city.' }, { status: 403 })
    }
  }

  if (user.role === 'WOREDA_ADMIN') {
    if (target.woredaId !== user.assignedWoredaId) {
      return NextResponse.json({ error: 'You can only delete targets within your woreda.' }, { status: 403 })
    }
  }

  await db.yearlyTaxTarget.delete({ where: { id } })
  return NextResponse.json({ ok: true, deleted: true })
}
