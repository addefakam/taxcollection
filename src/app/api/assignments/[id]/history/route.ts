import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// GET /api/assignments/[id]/history  - returns full audit timeline
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const history = await db.assignmentHistory.findMany({
    where: { assignmentId: id },
    orderBy: { timestamp: 'asc' },
  })
  return NextResponse.json(history)
}
