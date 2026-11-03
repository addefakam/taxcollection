import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const { fullName, email, phone, role, active } = body
  const s = await db.staff.update({
    where: { id },
    data: { fullName, email, phone, role, active },
  })
  return NextResponse.json(s)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  // soft delete
  const s = await db.staff.update({ where: { id }, data: { active: false } })
  return NextResponse.json(s)
}
