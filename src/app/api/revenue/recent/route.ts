import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET /api/revenue/recent?limit=20
// Returns the most recently collected taxes (COMPLETED with paymentDate)
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)

  const recent = await db.taxAssignment.findMany({
    where: {
      status: 'COMPLETED',
      paymentDate: { not: null },
    },
    orderBy: { paymentDate: 'desc' },
    take: limit,
    select: {
      id: true,
      referenceNo: true,
      paymentAmount: true,
      paymentDate: true,
      bankReceiptNumber: true,
      governmentReceiptNumber: true,
      governmentReceiptIssuedAt: true,
      taxType: true,
      taxPayer: {
        select: {
          id: true,
          tin: true,
          fullName: true,
          category: true,
          woreda: { select: { code: true, name: true } },
        },
      },
    },
  })

  return NextResponse.json({ recent, currentUser: user })
}
