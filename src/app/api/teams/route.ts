import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requireRole } from '@/lib/auth'

// GET /api/teams — list all teams (with members + lead)
export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const teams = await db.team.findMany({
    orderBy: { name: 'asc' },
    include: {
      lead: { select: { id: true, fullName: true, role: true } },
      woreda: { select: { id: true, name: true } },
      subCity: { select: { id: true, name: true } },
      _count: { select: { members: true } },
    },
  })
  return NextResponse.json(teams)
}

// POST /api/teams — create a team
// Hierarchical scoping: SUBCITY_ADMIN can only create teams in their sub-city,
// WOREDA_ADMIN can only create teams in their woreda.
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // CITY_ADMIN and above can create teams anywhere
  // SUBCITY_ADMIN and WOREDA_ADMIN can create teams (but scoped)
  const cityWideRoles = ['SYSTEM_ADMIN', 'CITY_ADMIN', 'LEADER']
  if (!cityWideRoles.includes(user.role)) {
    if (user.role !== 'SUBCITY_ADMIN' && user.role !== 'WOREDA_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json()
  const { name, description, woredaId, subCityId, leadStaffId } = body

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  // Determine final subCityId and woredaId based on role scoping
  let finalSubCityId = subCityId || null
  let finalWoredaId = woredaId || null

  if (user.role === 'SUBCITY_ADMIN') {
    if (!user.assignedSubCityId) {
      return NextResponse.json({ error: 'Your account is not assigned to a sub-city.' }, { status: 403 })
    }
    // Force subCityId to their sub-city
    finalSubCityId = user.assignedSubCityId

    // If woredaId is provided, verify it belongs to their sub-city
    if (finalWoredaId) {
      const woreda = await db.woreda.findUnique({
        where: { id: finalWoredaId },
        select: { subCityId: true },
      })
      if (!woreda || woreda.subCityId !== user.assignedSubCityId) {
        return NextResponse.json(
          { error: 'You can only create teams for woredas within your assigned sub-city.' },
          { status: 403 }
        )
      }
    }
  }

  if (user.role === 'WOREDA_ADMIN') {
    if (!user.assignedWoredaId) {
      return NextResponse.json({ error: 'Your account is not assigned to a woreda.' }, { status: 403 })
    }
    // Force woredaId to their woreda
    finalWoredaId = user.assignedWoredaId

    // Auto-set subCityId from the woreda
    const woreda = await db.woreda.findUnique({
      where: { id: user.assignedWoredaId },
      select: { subCityId: true },
    })
    finalSubCityId = woreda?.subCityId || null
  }

  const t = await db.team.create({
    data: {
      name,
      description,
      woredaId: finalWoredaId,
      subCityId: finalSubCityId,
      leadStaffId: leadStaffId || null,
    },
    include: {
      lead: { select: { id: true, fullName: true } },
      woreda: { select: { name: true } },
      subCity: { select: { name: true } },
    },
  })
  return NextResponse.json(t, { status: 201 })
}
