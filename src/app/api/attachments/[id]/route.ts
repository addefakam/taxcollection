import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requireRole } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// GET /api/attachments/[id]  (any logged-in staff — for download)
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const att = await db.bankReceiptAttachment.findUnique({ where: { id } })
  if (!att) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(att)
}

// DELETE /api/attachments/[id]  (Leader only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole('LEADER')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  await db.bankReceiptAttachment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
