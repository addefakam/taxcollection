import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// GET /api/attachments/[id]  - return the actual file content (base64 + metadata)
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const att = await db.bankReceiptAttachment.findUnique({ where: { id } })
  if (!att) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(att)
}

// DELETE /api/attachments/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  await db.bankReceiptAttachment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
