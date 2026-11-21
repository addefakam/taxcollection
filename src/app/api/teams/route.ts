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
export async function POST(req: NextRequest) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN', 'SUBCITY_ADMIN', 'WOREDA_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const body = await req.json()
  const { name, description, woredaId, subCityId, leadStaffId } = body

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const t = await db.team.create({
    data: { name, description, woredaId: woredaId || null, subCityId: subCityId || null, leadStaffId: leadStaffId || null },
    include: { lead: { select: { id: true, fullName: true } }, woreda: { select: { name: true } }, subCity: { select: { name: true } } },
  })
  return NextResponse.json(t, { status: 201 })
}
