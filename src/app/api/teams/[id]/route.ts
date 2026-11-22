import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PUT /api/teams/[id]
// SUBCITY_ADMIN: can only edit teams within their sub-city
// WOREDA_ADMIN: can only edit teams within their woreda
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN', 'SUBCITY_ADMIN', 'WOREDA_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { name, description, woredaId, subCityId, leadStaffId, active } = body

  // Verify ownership for scoped roles
  const team = await db.team.findUnique({
    where: { id },
    select: { subCityId: true, woredaId: true },
  })
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  if (user.role === 'SUBCITY_ADMIN') {
    // Check team belongs to their sub-city
    const belongsToSubCity = team.subCityId === user.assignedSubCityId ||
      (team.woredaId ? await db.woreda.findUnique({
        where: { id: team.woredaId },
        select: { subCityId: true },
      }).then(w => w?.subCityId === user.assignedSubCityId) : false)
    if (!belongsToSubCity) {
      return NextResponse.json(
        { error: 'You can only edit teams within your assigned sub-city.' },
        { status: 403 }
      )
    }
    // Prevent moving team to another sub-city
    if (subCityId && subCityId !== user.assignedSubCityId) {
      return NextResponse.json(
        { error: 'You cannot assign this team to another sub-city.' },
        { status: 403 }
      )
    }
    // If woredaId is being changed, verify new woreda belongs to their sub-city
    if (woredaId && woredaId !== team.woredaId) {
      const newWoreda = await db.woreda.findUnique({
        where: { id: woredaId },
        select: { subCityId: true },
      })
      if (!newWoreda || newWoreda.subCityId !== user.assignedSubCityId) {
        return NextResponse.json(
          { error: 'You can only assign teams to woredas within your sub-city.' },
          { status: 403 }
        )
      }
    }
  }

  if (user.role === 'WOREDA_ADMIN') {
    if (team.woredaId !== user.assignedWoredaId) {
      return NextResponse.json(
        { error: 'You can only edit teams within your assigned woreda.' },
        { status: 403 }
      )
    }
    // Prevent changing woredaId or subCityId
    if ((woredaId && woredaId !== user.assignedWoredaId) || (subCityId && subCityId !== team.subCityId)) {
      return NextResponse.json(
        { error: 'You cannot move this team to another woreda or sub-city.' },
        { status: 403 }
      )
    }
  }

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

// DELETE /api/teams/[id] — hard delete
// SUBCITY_ADMIN: can only delete teams within their sub-city
// WOREDA_ADMIN: can only delete teams within their woreda
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN', 'SUBCITY_ADMIN', 'WOREDA_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params

  // Verify ownership for scoped roles
  const team = await db.team.findUnique({
    where: { id },
    select: { subCityId: true, woredaId: true },
  })
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  if (user.role === 'SUBCITY_ADMIN') {
    const belongsToSubCity = team.subCityId === user.assignedSubCityId ||
      (team.woredaId ? await db.woreda.findUnique({
        where: { id: team.woredaId },
        select: { subCityId: true },
      }).then(w => w?.subCityId === user.assignedSubCityId) : false)
    if (!belongsToSubCity) {
      return NextResponse.json(
        { error: 'You can only delete teams within your assigned sub-city.' },
        { status: 403 }
      )
    }
  }

  if (user.role === 'WOREDA_ADMIN') {
    if (team.woredaId !== user.assignedWoredaId) {
      return NextResponse.json(
        { error: 'You can only delete teams within your assigned woreda.' },
        { status: 403 }
      )
    }
  }

  await db.team.delete({ where: { id } })
  return NextResponse.json({ ok: true, deleted: true })
}
