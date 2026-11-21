import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PUT /api/plans/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const {
    title, description, periodType, startDate, endDate,
    subCityId, woredaId, teamId, responsibleStaffId,
    activity, targetAmount, targetQuantity, expectedOutcome,
    priority, status, remarks, challenges,
  } = body

  const plan = await db.plan.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(periodType !== undefined && { periodType }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(subCityId !== undefined && { subCityId: subCityId || null }),
      ...(woredaId !== undefined && { woredaId: woredaId || null }),
      ...(teamId !== undefined && { teamId: teamId || null }),
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
  await db.plan.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
