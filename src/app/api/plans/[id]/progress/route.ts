import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/plans/[id]/progress — update actual achievement + progress
// Body: { actualAmount?, actualQuantity?, progress?, status?, remarks?, challenges? }
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { actualAmount, actualQuantity, progress, status, remarks, challenges } = body

  // Auto-calculate progress if targetAmount is set and actualAmount is provided
  let calculatedProgress = progress
  if (actualAmount !== undefined && progress === undefined) {
    const existing = await db.plan.findUnique({ where: { id }, select: { targetAmount: true } })
    if (existing?.targetAmount && Number(actualAmount) > 0) {
      calculatedProgress = Math.min(100, Math.round((Number(actualAmount) / existing.targetAmount) * 100))
    }
  }

  const plan = await db.plan.update({
    where: { id },
    data: {
      ...(actualAmount !== undefined && { actualAmount: Number(actualAmount) }),
      ...(actualQuantity !== undefined && { actualQuantity: Number(actualQuantity) }),
      ...(calculatedProgress !== undefined && { progress: Number(calculatedProgress) }),
      ...(status !== undefined && { status }),
      ...(remarks !== undefined && { remarks }),
      ...(challenges !== undefined && { challenges }),
    },
  })
  return NextResponse.json(plan)
}
