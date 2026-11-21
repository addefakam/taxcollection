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

  // Hierarchical scoping
  if (user.role === 'SUBCITY_ADMIN' && user.assignedSubCityId) {
    where.subCityId = user.assignedSubCityId
  } else if (user.role === 'WOREDA_ADMIN' && user.assignedWoredaId) {
    where.woredaId = user.assignedWoredaId
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

// POST /api/plans
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

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

  const plan = await db.plan.create({
    data: {
      title,
      description,
      periodType,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      subCityId: subCityId || null,
      woredaId: woredaId || null,
      teamId: teamId || null,
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
