import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requireRole } from '@/lib/auth'
import { TAX_CATEGORIES } from '@/components/tax-system/lib'

// GET /api/tax-targets?fiscalYear=...&level=...&subCityId=...&woredaId=...&teamId=...
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const fiscalYear = searchParams.get('fiscalYear')
  const level = searchParams.get('level') // CITY, SUBCITY, WOREDA, TEAM
  const subCityId = searchParams.get('subCityId')
  const woredaId = searchParams.get('woredaId')
  const teamId = searchParams.get('teamId')

  const where: Record<string, unknown> = {}
  if (fiscalYear) where.fiscalYear = fiscalYear
  if (level) where.level = level
  if (subCityId) where.subCityId = subCityId
  if (woredaId) where.woredaId = woredaId
  if (teamId) where.teamId = teamId

  const targets = await db.yearlyTaxTarget.findMany({
    where,
    orderBy: [{ level: 'asc' }, { category: 'asc' }],
    include: {
      woreda: { select: { id: true, name: true } },
      subCity: { select: { id: true, name: true } },
      team: { select: { id: true, name: true } },
      setBy: { select: { id: true, fullName: true } },
    },
  })

  // Build reconciliation data: for each CITY-level target, sum its SUBCITY children
  // and check if they match. Same for SUBCITY → WOREDA and WOREDA → TEAM.
  const reconciliation: Array<{
    parentLevel: string
    parentCategory: string
    parentAmount: number
    parentUnit: string
    childrenSum: number
    difference: number
    isBalanced: boolean
  }> = []

  if (!level || level === 'CITY') {
    const cityTargets = targets.filter(t => t.level === 'CITY')
    for (const ct of cityTargets) {
      const subCityChildren = await db.yearlyTaxTarget.findMany({
        where: { fiscalYear: ct.fiscalYear, level: 'SUBCITY', category: ct.category },
      })
      const childrenSum = subCityChildren.reduce((s, c) => s + c.expectedAmount, 0)
      if (childrenSum > 0) {
        reconciliation.push({
          parentLevel: 'CITY',
          parentCategory: ct.category,
          parentAmount: ct.expectedAmount,
          parentUnit: 'City-wide',
          childrenSum,
          difference: ct.expectedAmount - childrenSum,
          isBalanced: Math.abs(ct.expectedAmount - childrenSum) < 1,
        })
      }
    }
  }

  return NextResponse.json({ targets, reconciliation, currentUser: user })
}

// POST /api/tax-targets — create or update a target at any hierarchy level
export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireRole('LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN', 'SUBCITY_ADMIN', 'WOREDA_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const body = await req.json()
  const { fiscalYear, category, expectedAmount, notes, subCityId, woredaId, teamId } = body

  if (!fiscalYear || !category || expectedAmount === undefined) {
    return NextResponse.json(
      { error: 'fiscalYear, category, and expectedAmount are required' },
      { status: 400 }
    )
  }
  if (!TAX_CATEGORIES.some((c) => c.value === category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${TAX_CATEGORIES.map((c) => c.value).join(', ')}` },
      { status: 400 }
    )
  }

  // Determine the hierarchy level
  let level = 'CITY'
  let targetSubCityId = null
  let targetWoredaId = null
  let targetTeamId = null

  if (teamId) {
    level = 'TEAM'
    targetTeamId = teamId
  } else if (woredaId) {
    level = 'WOREDA'
    targetWoredaId = woredaId
  } else if (subCityId) {
    level = 'SUBCITY'
    targetSubCityId = subCityId
  }

  // Enforce hierarchical scoping:
  // - SUBCITY_ADMIN can only set targets for their own sub-city or woredas/teams under it
  // - WOREDA_ADMIN can only set targets for their own woreda or teams under it
  if (user.role === 'SUBCITY_ADMIN') {
    if (!user.assignedSubCityId) {
      return NextResponse.json({ error: 'Your account is not assigned to a sub-city.' }, { status: 403 })
    }
    // Force subCityId to be their sub-city
    // If they're setting a woreda target, verify the woreda belongs to their sub-city
    if (level === 'CITY') {
      return NextResponse.json(
        { error: 'Sub-City Admin can only set targets for their own sub-city or its woredas/teams, not city-wide targets.' },
        { status: 403 }
      )
    }
    if (level === 'SUBCITY') {
      // Force to their own sub-city
      targetSubCityId = user.assignedSubCityId
    }
    if (level === 'WOREDA' && targetWoredaId) {
      // Verify the woreda belongs to their sub-city
      const woreda = await db.woreda.findUnique({
        where: { id: targetWoredaId },
        select: { subCityId: true },
      })
      if (!woreda || woreda.subCityId !== user.assignedSubCityId) {
        return NextResponse.json(
          { error: 'You can only set targets for woredas within your assigned sub-city.' },
          { status: 403 }
        )
      }
    }
    if (level === 'TEAM' && targetTeamId) {
      // Verify the team belongs to a woreda in their sub-city
      const team = await db.team.findUnique({
        where: { id: targetTeamId },
        select: { woreda: { select: { subCityId: true } }, subCityId: true },
      })
      const teamSubCityId = team?.subCityId || team?.woreda?.subCityId
      if (teamSubCityId !== user.assignedSubCityId) {
        return NextResponse.json(
          { error: 'You can only set targets for teams within your assigned sub-city.' },
          { status: 403 }
        )
      }
    }
  }

  if (user.role === 'WOREDA_ADMIN') {
    if (!user.assignedWoredaId) {
      return NextResponse.json({ error: 'Your account is not assigned to a woreda.' }, { status: 403 })
    }
    if (level === 'CITY' || level === 'SUBCITY') {
      return NextResponse.json(
        { error: 'Woreda Admin can only set targets for their own woreda or its teams.' },
        { status: 403 }
      )
    }
    if (level === 'WOREDA') {
      // Force to their own woreda
      targetWoredaId = user.assignedWoredaId
    }
    if (level === 'TEAM' && targetTeamId) {
      // Verify the team belongs to their woreda
      const team = await db.team.findUnique({
        where: { id: targetTeamId },
        select: { woredaId: true },
      })
      if (team?.woredaId !== user.assignedWoredaId) {
        return NextResponse.json(
          { error: 'You can only set targets for teams within your assigned woreda.' },
          { status: 403 }
        )
      }
    }
  }

  // Check for existing target at this level + category + fiscal year
  const existing = await db.yearlyTaxTarget.findFirst({
    where: {
      fiscalYear,
      level,
      category,
      subCityId: targetSubCityId,
      woredaId: targetWoredaId,
      teamId: targetTeamId,
    },
  })

  let target
  if (existing) {
    target = await db.yearlyTaxTarget.update({
      where: { id: existing.id },
      data: {
        expectedAmount: Number(expectedAmount),
        notes: notes || null,
        setByStaffId: user.id,
      },
      include: { woreda: { select: { name: true } }, subCity: { select: { name: true } }, team: { select: { name: true } } },
    })
  } else {
    target = await db.yearlyTaxTarget.create({
      data: {
        fiscalYear,
        level,
        category,
        expectedAmount: Number(expectedAmount),
        notes: notes || null,
        setByStaffId: user.id,
        subCityId: targetSubCityId,
        woredaId: targetWoredaId,
        teamId: targetTeamId,
      },
      include: { woreda: { select: { name: true } }, subCity: { select: { name: true } }, team: { select: { name: true } } },
    })
  }

  return NextResponse.json({ target, currentUser: user }, { status: 201 })
}
