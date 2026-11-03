import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PUT /api/staff/[id]  (Leader only)
// Body: { fullName?, email?, phone?, role?, active? }
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const body = await req.json()
  const { fullName, email, phone, role, active } = body

  if (role && !['LEADER', 'TEAM_1_ASSIGNMENT', 'TEAM_2_FINANCE'].includes(role)) {
    return NextResponse.json(
      { error: 'Invalid role. Must be LEADER, TEAM_1_ASSIGNMENT, or TEAM_2_FINANCE' },
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
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      active: true,
    },
  })
  return NextResponse.json(s)
}

// DELETE /api/staff/[id]  (Leader only — soft delete)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  // Prevent self-deactivation
  // (Leader shouldn't be able to lock themselves out)
  const target = await db.staff.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // soft delete
  const s = await db.staff.update({
    where: { id },
    data: { active: false },
    select: { id: true, fullName: true, active: true },
  })
  return NextResponse.json(s)
}
