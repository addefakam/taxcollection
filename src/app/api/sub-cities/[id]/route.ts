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

// DELETE /api/sub-cities/[id] — hard delete from database
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params

  // Check if sub-city has woredas or staff assigned
  const woredas = await db.woreda.findMany({ where: { subCityId: id } })
  if (woredas.length > 0) {
    return NextResponse.json(
      { error: `Cannot delete: this sub-city has ${woredas.length} woreda(s). Delete or reassign them first.` },
      { status: 400 }
    )
  }

  const staff = await db.staff.findMany({ where: { assignedSubCityId: id } })
  if (staff.length > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${staff.length} staff member(s) are assigned to this sub-city. Reassign them first.` },
      { status: 400 }
    )
  }

  // Check for teams
  const teams = await db.team.findMany({ where: { subCityId: id } })
  if (teams.length > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${teams.length} team(s) belong to this sub-city. Delete them first.` },
      { status: 400 }
    )
  }

  // Check for tax targets
  const targets = await db.yearlyTaxTarget.findMany({ where: { subCityId: id } })
  if (targets.length > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${targets.length} tax target(s) reference this sub-city. Delete them first.` },
      { status: 400 }
    )
  }

  // Check for plans
  const plans = await db.plan.findMany({ where: { subCityId: id } })
  if (plans.length > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${plans.length} plan(s) reference this sub-city. Delete them first.` },
      { status: 400 }
    )
  }

  // Safe to delete — permanently remove from database
  await db.subCity.delete({ where: { id } })
  return NextResponse.json({ ok: true, deleted: true })
}
