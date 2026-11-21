import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { getNotificationsForUser, checkOverduePlans, checkOverdueAssignments, checkApproachingDeadlines } from '@/lib/notifications'

// GET /api/notifications — list notifications for the current user
export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Auto-check for overdue items before returning notifications
  try {
    await Promise.all([
      checkOverduePlans(),
      checkOverdueAssignments(),
      checkApproachingDeadlines(),
    ])
  } catch {
    // ignore auto-check errors
  }

  const { notifications, unreadCount } = await getNotificationsForUser(user)
  return NextResponse.json({ notifications, unreadCount })
}
