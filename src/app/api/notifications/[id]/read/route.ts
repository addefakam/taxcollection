import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// PATCH /api/notifications/[id]/read — mark as read
export async function PATCH(_req: NextRequest, { params }: Params) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params

  // Verify the notification belongs to this user (or is broadcast to their role)
  const notif = await db.notification.findUnique({ where: { id } })
  if (!notif) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (notif.recipientStaffId !== user.id && notif.broadcastRole !== user.role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // For broadcast notifications, we need per-user read tracking.
  // Simple approach: if it's a broadcast, create a copy for this user with readAt set.
  // For direct notifications, just set readAt.
  if (notif.broadcastRole && !notif.recipientStaffId) {
    // Check if a personal copy already exists
    const existing = await db.notification.findFirst({
      where: {
        recipientStaffId: user.id,
        relatedType: notif.relatedType,
        relatedId: notif.relatedId,
        type: notif.type,
        readAt: { not: null },
      },
    })
    if (!existing) {
      // Create a personal "read" copy so this user doesn't see it as unread again
      await db.notification.create({
        data: {
          type: notif.type,
          title: notif.title,
          message: notif.message,
          priority: notif.priority,
          recipientStaffId: user.id,
          relatedType: notif.relatedType,
          relatedId: notif.relatedId,
          readAt: new Date(),
        },
      })
    }
  } else {
    await db.notification.update({
      where: { id },
      data: { readAt: new Date() },
    })
  }

  return NextResponse.json({ ok: true })
}
