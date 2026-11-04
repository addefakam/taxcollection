import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, requireRole } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// GET /api/assignments/[id]/attachments  (any logged-in staff)
// Returns metadata only (no base64 content) — fetch via /api/attachments/[id] for download
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const attachments = await db.bankReceiptAttachment.findMany({
    where: { assignmentId: id },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      uploadedByStaffId: true,
      uploadedAt: true,
    },
  })
  return NextResponse.json(attachments)
}

// POST /api/assignments/[id]/attachments  (Leader or Team 2)
// Body: { fileName, mimeType, content (base64) }
export async function POST(req: NextRequest, { params }: Params) {
  let user
  try {
    user = await requireRole('LEADER', 'TEAM_2_FINANCE')
  } catch (e) {
    if (e instanceof Response) return NextResponse.json(await e.json(), { status: e.status })
    throw e
  }

  const { id } = await params
  const body = await req.json()
  const { fileName, mimeType, content } = body

  if (!fileName || !mimeType || !content) {
    return NextResponse.json(
      { error: 'fileName, mimeType and content are required' },
      { status: 400 }
    )
  }

  // Compute size: base64 length * 3/4 = byte size (approx)
  const fileSize = Math.floor((content.length * 3) / 4)

  const att = await db.bankReceiptAttachment.create({
    data: {
      assignmentId: id,
      fileName,
      mimeType,
      fileSize,
      content,
      uploadedByStaffId: user.id,
    },
  })

  return NextResponse.json(
    {
      id: att.id,
      fileName: att.fileName,
      mimeType: att.mimeType,
      fileSize: att.fileSize,
      uploadedAt: att.uploadedAt,
    },
    { status: 201 }
  )
}
