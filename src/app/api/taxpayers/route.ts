import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/taxpayers?q=...&category=...&active=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''
  const category = searchParams.get('category') || ''
  const active = searchParams.get('active')

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [
      { tin: { contains: q } },
      { fullName: { contains: q } },
      { phone: { contains: q } },
    ]
  }
  if (category) where.category = category
  if (active === 'true') where.active = true
  if (active === 'false') where.active = false

  const taxpayers = await db.taxPayer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { assignments: true } },
    },
  })
  return NextResponse.json(taxpayers)
}

// POST /api/taxpayers
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { tin, fullName, category, phone, email, address, woreda, kebele } = body

  if (!tin || !fullName || !category) {
    return NextResponse.json(
      { error: 'tin, fullName and category are required' },
      { status: 400 }
    )
  }

  const exists = await db.taxPayer.findUnique({ where: { tin } })
  if (exists) {
    return NextResponse.json(
      { error: `Tax payer with TIN ${tin} already exists` },
      { status: 409 }
    )
  }

  const tp = await db.taxPayer.create({
    data: { tin, fullName, category, phone, email, address, woreda, kebele },
  })
  return NextResponse.json(tp, { status: 201 })
}
