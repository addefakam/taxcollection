import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// GET /api/taxpayers/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const tp = await db.taxPayer.findUnique({
    where: { id },
    include: {
      assignments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!tp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(tp)
}

// PUT /api/taxpayers/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const { fullName, category, phone, email, address, woreda, kebele, active, tin } = body

  const tp = await db.taxPayer.update({
    where: { id },
    data: { fullName, category, phone, email, address, woreda, kebele, active, tin },
  })
  return NextResponse.json(tp)
}

// DELETE /api/taxpayers/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  // soft delete
  const tp = await db.taxPayer.update({
    where: { id },
    data: { active: false },
  })
  return NextResponse.json(tp)
}
