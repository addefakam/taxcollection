import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PUT /api/staff/[id]  (Leader, City Admin, SubCity Admin, or System Admin)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN', 'SUBCITY_ADMIN', 'WOREDA_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const body = await req.json()
  const { fullName, email, phone, role, active } = body

  // Validate hierarchical scoping
  if (role === 'SUBCITY_ADMIN' && body.assignedSubCityId === undefined) {
    return NextResponse.json(
      { error: 'Sub-City Admin must be assigned to a sub-city' },
      { status: 400 }
    )
  }
  if (role === 'WOREDA_ADMIN' && body.assignedWoredaId === undefined) {
    return NextResponse.json(
      { error: 'Woreda Admin must be assigned to a woreda' },
      { status: 400 }
    )
  }

  const s = await db.staff.update({
    where: { id },
    data: {
      ...(fullName !== undefined && { fullName }),
      ...(email !== undefined && { email: email.toLowerCase().trim() }),
      ...(phone !== undefined && { phone }),
      ...(role !== undefined && { role }),
      ...(active !== undefined && { active }),
      ...(body.assignedSubCityId !== undefined && { assignedSubCityId: body.assignedSubCityId || null }),
      ...(body.assignedWoredaId !== undefined && { assignedWoredaId: body.assignedWoredaId || null }),
      ...(body.teamId !== undefined && { teamId: body.teamId || null }),
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      active: true,
      assignedWoredaId: true,
      assignedWoreda: { select: { id: true, name: true } },
      assignedSubCityId: true,
      assignedSubCity: { select: { id: true, name: true } },
      teamId: true,
      team: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(s)
}

// DELETE /api/staff/[id]  (Leader or System Admin — soft delete)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const s = await db.staff.update({ where: { id }, data: { active: false } })
  return NextResponse.json(s)
}
