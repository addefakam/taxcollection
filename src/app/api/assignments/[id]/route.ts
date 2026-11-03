import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// GET /api/assignments/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const assignment = await db.taxAssignment.findUnique({
    where: { id },
    include: {
      taxPayer: true,
      history: { orderBy: { timestamp: 'asc' } },
    },
  })
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(assignment)
}

// PUT /api/assignments/[id]  (general update - e.g. leader edits amount/due date)
export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const { amountDue, dueDate, description, notes, period, taxType, fiscalYear, performedBy } = body

  const existing = await db.taxAssignment.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.taxAssignment.update({
    where: { id },
    data: {
      amountDue: amountDue !== undefined ? Number(amountDue) : undefined,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
      description,
      notes,
      period,
      taxType,
      fiscalYear,
    },
    include: { taxPayer: true },
  })

  if (performedBy) {
    await db.assignmentHistory.create({
      data: {
        assignmentId: id,
        action: 'EDIT',
        fromStatus: existing.status,
        toStatus: existing.status,
        performedBy,
        note: `Assignment details edited`,
      },
    })
  }

  return NextResponse.json(updated)
}
