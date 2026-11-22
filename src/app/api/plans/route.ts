import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/plans?periodType=...&status=...&subCityId=...&woredaId=...&teamId=...
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const periodType = searchParams.get('periodType')
  const status = searchParams.get('status')
  const subCityId = searchParams.get('subCityId')
  const woredaId = searchParams.get('woredaId')
  const teamId = searchParams.get('teamId')

  const where: Record<string, unknown> = {}
  if (periodType) where.periodType = periodType
  if (status) where.status = status
  if (subCityId) where.subCityId = subCityId
  if (woredaId) where.woredaId = woredaId
  if (teamId) where.teamId = teamId

  // Hierarchical scoping — each role only sees plans within their access level (downward)
  if (user.role === 'SUBCITY_ADMIN' && user.assignedSubCityId) {
    // All plans in their sub-city: sub-city-level plans + woreda-level plans in their sub-city + team-level plans in their sub-city
    const woredaIdsInSub = (await db.woreda.findMany({
      where: { subCityId: user.assignedSubCityId },
      select: { id: true },
    })).map(w => w.id)
    const teamIdsInSub = (await db.team.findMany({
      where: {
        OR: [
          { subCityId: user.assignedSubCityId },
          { woredaId: { in: woredaIdsInSub } },
        ],
      },
      select: { id: true },
    })).map(t => t.id)
    where.OR = [
      { subCityId: user.assignedSubCityId, woredaId: null, teamId: null },
      { woredaId: { in: woredaIdsInSub }, teamId: null },
      { teamId: { in: teamIdsInSub } },
    ]
  } else if (user.role === 'WOREDA_ADMIN' && user.assignedWoredaId) {
    // Woreda-level plans + team-level plans in their woreda
    const teamIdsInWoreda = (await db.team.findMany({
      where: { woredaId: user.assignedWoredaId },
      select: { id: true },
    })).map(t => t.id)
    where.OR = [
      { woredaId: user.assignedWoredaId, teamId: null },
      { teamId: { in: teamIdsInWoreda } },
    ]
  } else if (user.role === 'TEAM_LEAD' && user.teamId) {
    where.teamId = user.teamId
  } else if (user.role === 'DATA_COLLECTOR' && user.assignedWoredaId) {
    where.woredaId = user.assignedWoredaId
  }

  const plans = await db.plan.findMany({
    where,
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    include: {
      subCity: { select: { id: true, name: true } },
      woreda: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
      responsible: { select: { id: true, fullName: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  })
  return NextResponse.json(plans)
}

// POST /api/plans — create a plan
// Hierarchical scoping: each role can create plans DOWNWARD only — not upward.
//   - SYSTEM_ADMIN / CITY_ADMIN / LEADER: any level (City / Sub-City / Woreda / Team)
//   - SUBCITY_ADMIN: Sub-City or Woreda level — within their sub-city only (no City, no Team)
//   - WOREDA_ADMIN: Woreda or Team — within their woreda only (no City / Sub-City)
//   - TEAM_LEAD: Team only — their team
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const cityWideRoles = ['SYSTEM_ADMIN', 'CITY_ADMIN', 'LEADER']
  const canCreate = cityWideRoles.includes(user.role)
    || user.role === 'SUBCITY_ADMIN'
    || user.role === 'WOREDA_ADMIN'
    || user.role === 'TEAM_LEAD'
  if (!canCreate) {
    return NextResponse.json({ error: 'Forbidden — your role cannot create plans.' }, { status: 403 })
  }

  const body = await req.json()
  const {
    title, description, periodType, startDate, endDate,
    subCityId, woredaId, teamId, responsibleStaffId,
    activity, targetAmount, targetQuantity, expectedOutcome,
    priority, remarks,
  } = body

  if (!title || !periodType || !startDate || !endDate || !activity) {
    return NextResponse.json(
      { error: 'title, periodType, startDate, endDate, and activity are required' },
      { status: 400 }
    )
  }

  // Determine the plan level from the supplied IDs
  // (team → woreda → sub-city → city)
  const hasTeam = !!teamId
  const hasWoreda = !!woredaId
  const hasSubCity = !!subCityId

  // ---- Role-based downward-only enforcement ----
  let finalSubCityId: string | null = subCityId || null
  let finalWoredaId: string | null = woredaId || null
  let finalTeamId: string | null = teamId || null

  if (user.role === 'SUBCITY_ADMIN') {
    if (!user.assignedSubCityId) {
      return NextResponse.json({ error: 'Your account is not assigned to a sub-city.' }, { status: 403 })
    }
    // SUBCITY_ADMIN cannot create City-level plans (downward only)
    if (!hasSubCity && !hasWoreda && !hasTeam) {
      return NextResponse.json(
        { error: 'As a Sub-City Admin, you can only create plans at Sub-City or Woreda level — not City level.' },
        { status: 403 }
      )
    }
    // SUBCITY_ADMIN cannot create Team-level plans — only Sub-City and Woreda levels
    if (hasTeam) {
      return NextResponse.json(
        { error: 'As a Sub-City Admin, you can only create plans at Sub-City or Woreda level — not Team level.' },
        { status: 403 }
      )
    }
    // Force subCityId to their sub-city at sub-city level
    if (hasSubCity && !hasWoreda) {
      finalSubCityId = user.assignedSubCityId
    }
    // If woreda provided, verify it belongs to their sub-city
    if (finalWoredaId) {
      const woreda = await db.woreda.findUnique({
        where: { id: finalWoredaId },
        select: { subCityId: true },
      })
      if (!woreda || woreda.subCityId !== user.assignedSubCityId) {
        return NextResponse.json(
          { error: 'You can only create plans for woredas within your assigned sub-city.' },
          { status: 403 }
        )
      }
      finalSubCityId = woreda.subCityId
    }
  }

  if (user.role === 'WOREDA_ADMIN') {
    if (!user.assignedWoredaId) {
      return NextResponse.json({ error: 'Your account is not assigned to a woreda.' }, { status: 403 })
    }
    // WOREDA_ADMIN cannot create City or Sub-City level plans (downward only)
    if ((hasSubCity && !hasWoreda && !hasTeam) || (!hasSubCity && !hasWoreda && !hasTeam)) {
      return NextResponse.json(
        { error: 'As a Woreda Admin, you can only create plans at Woreda or Team level — not City or Sub-City level.' },
        { status: 403 }
      )
    }
    // Sub-city cannot be set manually for woreda-level or team-level plans — derive from woreda
    if (hasSubCity && subCityId !== user.assignedSubCityId && !hasWoreda && !hasTeam) {
      return NextResponse.json(
        { error: 'As a Woreda Admin, you cannot assign a sub-city directly.' },
        { status: 403 }
      )
    }
    // Force woredaId to their woreda for woreda-level plans
    if (hasWoreda && !hasTeam) {
      finalWoredaId = user.assignedWoredaId
    }
    // Auto-set subCityId from the woreda
    if (finalWoredaId) {
      const woreda = await db.woreda.findUnique({
        where: { id: finalWoredaId },
        select: { subCityId: true },
      })
      finalSubCityId = woreda?.subCityId || null
    }
    // If team provided, verify it belongs to their woreda
    if (finalTeamId) {
      const team = await db.team.findUnique({
        where: { id: finalTeamId },
        select: { woredaId: true, subCityId: true },
      })
      if (!team) {
        return NextResponse.json({ error: 'Team not found.' }, { status: 400 })
      }
      if (!team.woredaId || team.woredaId !== user.assignedWoredaId) {
        return NextResponse.json(
          { error: 'You can only create plans for teams within your assigned woreda.' },
          { status: 403 }
        )
      }
      finalWoredaId = team.woredaId
      finalSubCityId = team.subCityId || (
        await db.woreda.findUnique({ where: { id: team.woredaId }, select: { subCityId: true } })
      )?.subCityId || null
    }
  }

  if (user.role === 'TEAM_LEAD') {
    if (!user.teamId) {
      return NextResponse.json({ error: 'Your account is not assigned to a team.' }, { status: 403 })
    }
    // TEAM_LEAD can only create team-level plans — their team only
    if (!hasTeam) {
      return NextResponse.json(
        { error: 'As a Team Lead, you can only create plans for your team — not at higher levels.' },
        { status: 403 }
      )
    }
    if (teamId !== user.teamId) {
      return NextResponse.json(
        { error: 'You can only create plans for your own team.' },
        { status: 403 }
      )
    }
    const team = await db.team.findUnique({
      where: { id: user.teamId },
      select: { subCityId: true, woredaId: true },
    })
    finalTeamId = user.teamId
    finalWoredaId = team?.woredaId || null
    finalSubCityId = team?.subCityId || (
      team?.woredaId
        ? (await db.woreda.findUnique({ where: { id: team.woredaId }, select: { subCityId: true } }))?.subCityId
        : null
    ) || null
  }

  const plan = await db.plan.create({
    data: {
      title,
      description,
      periodType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      subCityId: finalSubCityId,
      woredaId: finalWoredaId,
      teamId: finalTeamId,
      responsibleStaffId: responsibleStaffId || null,
      activity,
      targetAmount: targetAmount ? Number(targetAmount) : null,
      targetQuantity: targetQuantity ? Number(targetQuantity) : null,
      expectedOutcome,
      priority: priority || 'MEDIUM',
      status: 'DRAFT',
      remarks,
      createdByStaffId: user.id,
    },
    include: {
      subCity: { select: { name: true } },
      woreda: { select: { name: true } },
      team: { select: { name: true } },
      responsible: { select: { fullName: true } },
    },
  })
  return NextResponse.json(plan, { status: 201 })
}
