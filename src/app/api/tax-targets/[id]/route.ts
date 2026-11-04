import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireRole } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PUT /api/tax-targets/[id]  (Leader only)
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const body = await req.json()
  const { expectedAmount, notes } = body

  if (expectedAmount === undefined) {
    return NextResponse.json({ error: 'expectedAmount is required' }, { status: 400 })
  }

  const t = await db.yearlyTaxTarget.update({
    where: { id },
    data: { expectedAmount: Number(expectedAmount), notes: notes || null },
    include: { woreda: true },
  })
  return NextResponse.json(t)
}

// DELETE /api/tax-targets/[id]  (Leader only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  await db.yearlyTaxTarget.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
