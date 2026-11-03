import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// GET /api/assignments/[id]/attachments  - list attachments metadata
export async function GET(_req: NextRequest, { params }: Params) {
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
      // Do NOT return content here (could be large); fetch via [attachId] route
    },
  })
  return NextResponse.json(attachments)
}

// POST /api/assignments/[id]/attachments  - upload new attachment
// Body: { fileName, mimeType, content (base64), uploadedByStaffId }
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const { fileName, mimeType, content, uploadedByStaffId } = body

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
      uploadedByStaffId: uploadedByStaffId || null,
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
