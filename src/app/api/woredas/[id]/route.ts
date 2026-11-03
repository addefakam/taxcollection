import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const { code, name, region, active } = body
  const w = await db.woreda.update({
    where: { id },
    data: { code, name, region, active },
  })
  return NextResponse.json(w)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  // soft delete
  const w = await db.woreda.update({ where: { id }, data: { active: false } })
  return NextResponse.json(w)
}
