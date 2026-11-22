import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// Verify the caller can access (edit/delete) a plan based on their role scope.
// Returns null if allowed, or a 403 NextResponse if forbidden.
async function verifyPlanOwnership(
  planId: string,
  user: { id: string; role: string; assignedSubCityId?: string | null; assignedWoredaId?: string | null; teamId?: string | null }
): Promise<NextResponse | null> {
  const cityWideRoles = ['SYSTEM_ADMIN', 'CITY_ADMIN', 'LEADER']
  if (cityWideRoles.includes(user.role)) return null // full access

  const plan = await db.plan.findUnique({
    where: { id: planId },
    select: { subCityId: true, woredaId: true, teamId: true },
  })
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  if (user.role === 'SUBCITY_ADMIN') {
    if (!user.assignedSubCityId) {
      return NextResponse.json({ error: 'Your account is not assigned to a sub-city.' }, { status: 403 })
    }
    // Sub-city level: direct match
    if (plan.subCityId && !plan.woredaId && !plan.teamId) {
      if (plan.subCityId !== user.assignedSubCityId) {
        return NextResponse.json({ error: 'This plan belongs to a different sub-city.' }, { status: 403 })
      }
      return null
    }
    // Woreda level: verify woreda is in their sub-city
    if (plan.woredaId && !plan.teamId) {
      const woreda = await db.woreda.findUnique({
        where: { id: plan.woredaId },
        select: { subCityId: true },
      })
      if (!woreda || woreda.subCityId !== user.assignedSubCityId) {
        return NextResponse.json({ error: 'This plan belongs to a woreda outside your sub-city.' }, { status: 403 })
      }
      return null
    }
    // Team level: verify team is in their sub-city
    if (plan.teamId) {
      const team = await db.team.findUnique({
        where: { id: plan.teamId },
        select: { subCityId: true, woredaId: true },
      })
      const teamSubCityId = team?.subCityId || (
        team?.woredaId
          ? (await db.woreda.findUnique({ where: { id: team.woredaId }, select: { subCityId: true } }))?.subCityId
          : null
      )
      if (!teamSubCityId || teamSubCityId !== user.assignedSubCityId) {
        return NextResponse.json({ error: 'This plan belongs to a team outside your sub-city.' }, { status: 403 })
      }
      return null
    }
    // City-level plan — Sub-City Admin cannot edit
    return NextResponse.json(
      { error: 'As a Sub-City Admin, you cannot modify City-level plans.' },
      { status: 403 }
    )
  }

  if (user.role === 'WOREDA_ADMIN') {
    if (!user.assignedWoredaId) {
      return NextResponse.json({ error: 'Your account is not assigned to a woreda.' }, { status: 403 })
    }
    // Woreda level: direct match
    if (plan.woredaId && !plan.teamId) {
      if (plan.woredaId !== user.assignedWoredaId) {
        return NextResponse.json({ error: 'This plan belongs to a different woreda.' }, { status: 403 })
      }
      return null
    }
    // Team level: verify team is in their woreda
    if (plan.teamId) {
      const team = await db.team.findUnique({
        where: { id: plan.teamId },
        select: { woredaId: true },
      })
      if (!team?.woredaId || team.woredaId !== user.assignedWoredaId) {
        return NextResponse.json({ error: 'This plan belongs to a team outside your woreda.' }, { status: 403 })
      }
      return null
    }
    // City or Sub-City level — Woreda Admin cannot edit
    return NextResponse.json(
      { error: 'As a Woreda Admin, you cannot modify City or Sub-City level plans.' },
      { status: 403 }
    )
  }

  if (user.role === 'TEAM_LEAD') {
    if (!user.teamId) {
      return NextResponse.json({ error: 'Your account is not assigned to a team.' }, { status: 403 })
    }
    if (!plan.teamId || plan.teamId !== user.teamId) {
      return NextResponse.json(
        { error: 'As a Team Lead, you can only modify plans for your own team.' },
        { status: 403 }
      )
    }
    return null
  }

  // Other roles (DATA_COLLECTOR, TEAM_MEMBER, etc.) — no edit/delete access
  return NextResponse.json(
    { error: 'Your role does not have permission to modify plans.' },
    { status: 403 }
  )
}

// PUT /api/plans/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params

  // Ownership check
  const denied = await verifyPlanOwnership(id, user)
  if (denied) return denied

  const body = await req.json()
  const {
    title, description, periodType, startDate, endDate,
    subCityId, woredaId, teamId, responsibleStaffId,
    activity, targetAmount, targetQuantity, expectedOutcome,
    priority, status, remarks, challenges,
  } = body

  // For scoped roles, force subCityId/woredaId/teamId to their scope on update
  let finalSubCityId = subCityId
  let finalWoredaId = woredaId
  let finalTeamId = teamId

  if (user.role === 'SUBCITY_ADMIN' && user.assignedSubCityId) {
    if (finalSubCityId !== undefined && finalSubCityId && !finalWoredaId && !finalTeamId) {
      finalSubCityId = user.assignedSubCityId
    }
  }
  if (user.role === 'WOREDA_ADMIN' && user.assignedWoredaId) {
    if (finalWoredaId !== undefined && finalWoredaId && !finalTeamId) {
      finalWoredaId = user.assignedWoredaId
    }
  }
  if (user.role === 'TEAM_LEAD' && user.teamId) {
    if (finalTeamId !== undefined) {
      finalTeamId = user.teamId
    }
  }

  const plan = await db.plan.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(periodType !== undefined && { periodType }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(finalSubCityId !== undefined && { subCityId: finalSubCityId || null }),
      ...(finalWoredaId !== undefined && { woredaId: finalWoredaId || null }),
      ...(finalTeamId !== undefined && { teamId: finalTeamId || null }),
      ...(responsibleStaffId !== undefined && { responsibleStaffId: responsibleStaffId || null }),
      ...(activity !== undefined && { activity }),
      ...(targetAmount !== undefined && { targetAmount: targetAmount ? Number(targetAmount) : null }),
      ...(targetQuantity !== undefined && { targetQuantity: targetQuantity ? Number(targetQuantity) : null }),
      ...(expectedOutcome !== undefined && { expectedOutcome }),
      ...(priority !== undefined && { priority }),
      ...(status !== undefined && { status }),
      ...(remarks !== undefined && { remarks }),
      ...(challenges !== undefined && { challenges }),
    },
    include: {
      subCity: { select: { name: true } },
      woreda: { select: { name: true } },
      team: { select: { name: true } },
      responsible: { select: { fullName: true } },
    },
  })
  return NextResponse.json(plan)
}

// DELETE /api/plans/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params

  // Ownership check
  const denied = await verifyPlanOwnership(id, user)
  if (denied) return denied

  await db.plan.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
