import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/taxpayers/[id]/block
// Body: { blocked: true/false, reason, blockedByStaffId }
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const { blocked, reason, blockedByStaffId } = body

  const tp = await db.taxPayer.findUnique({ where: { id } })
  if (!tp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.taxPayer.update({
    where: { id },
    data: {
      blocked: !!blocked,
      blockedReason: blocked ? (reason || null) : null,
      blockedAt: blocked ? new Date() : null,
      blockedByStaffId: blocked ? (blockedByStaffId || null) : null,
    },
  })
  return NextResponse.json(updated)
}
