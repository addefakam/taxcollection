import { db } from './db'
import type { SessionUser } from './auth'

// Notification types
export type NotificationType =
  | 'DEADLINE_WARNING'
  | 'OVERDUE'
  | 'LOW_PERFORMANCE'
  | 'PLAN_INCOMPLETE'
  | 'PLAN_OVERDUE'
  | 'TARGET_ASSIGNED'
  | 'TARGET_ACHIEVED'
  | 'ASSIGNMENT_CREATED'
  | 'BANK_RECEIPT_RECEIVED'
  | 'GOVT_RECEIPT_ISSUED'
  | 'GENERAL'

export interface NotificationPriority {
  LOW: string; MEDIUM: string; HIGH: string; CRITICAL: string
}

/** Create a notification for a specific staff member */
export async function notifyStaff(
  recipientStaffId: string,
  type: NotificationType,
  title: string,
  message: string,
  priority: string = 'MEDIUM',
  relatedType?: string,
  relatedId?: string,
) {
  return db.notification.create({
    data: {
      type, title, message, priority,
      recipientStaffId,
      relatedType, relatedId,
    },
  })
}

/** Create a broadcast notification for all staff with a specific role */
export async function notifyRole(
  broadcastRole: string,
  type: NotificationType,
  title: string,
  message: string,
  priority: string = 'MEDIUM',
  relatedType?: string,
  relatedId?: string,
) {
  return db.notification.create({
    data: {
      type, title, message, priority,
      broadcastRole,
      relatedType, relatedId,
    },
  })
}

/** Get notifications visible to a user (direct + broadcast to their role) */
export async function getNotificationsForUser(user: SessionUser, limit = 50) {
  const where = {
    OR: [
      { recipientStaffId: user.id },
      { broadcastRole: user.role },
    ],
  }
  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: [{ readAt: 'asc' }, { createdAt: 'desc' }],
      take: limit,
    }),
    db.notification.count({
      where: { ...where, readAt: null },
    }),
  ])
  return { notifications, unreadCount }
}

/** Check for overdue plans and auto-generate notifications */
export async function checkOverduePlans() {
  const now = new Date()
  const overduePlans = await db.plan.findMany({
    where: {
      status: { in: ['DRAFT', 'ACTIVE'] },
      endDate: { lt: now },
    },
    include: { responsible: true, subCity: true, woreda: true },
  })

  for (const plan of overduePlans) {
    // Check if we already notified about this plan being overdue
    const existing = await db.notification.findFirst({
      where: {
        type: 'PLAN_OVERDUE',
        relatedType: 'PLAN',
        relatedId: plan.id,
      },
    })
    if (existing) continue

    // Mark plan as overdue
    await db.plan.update({ where: { id: plan.id }, data: { status: 'OVERDUE' } })

    // Notify responsible person
    if (plan.responsibleStaffId) {
      await notifyStaff(
        plan.responsibleStaffId,
        'PLAN_OVERDUE',
        `Plan Overdue: ${plan.title}`,
        `The plan "${plan.title}" was due on ${plan.endDate.toLocaleDateString('en-GB')} but is only ${plan.progress}% complete. Target: ETB ${plan.targetAmount || 0}, Actual: ETB ${plan.actualAmount || 0}.`,
        'HIGH',
        'PLAN',
        plan.id,
      )
    }

    // Notify admins
    await notifyRole(
      'LEADER',
      'PLAN_OVERDUE',
      `Plan Overdue: ${plan.title}`,
      `Plan "${plan.title}" (responsible: ${plan.responsible?.fullName || 'unassigned'}) is overdue. Progress: ${plan.progress}%.`,
      'MEDIUM',
      'PLAN',
      plan.id,
    )
  }
  return overduePlans.length
}

/** Check for approaching assignment deadlines (within 7 days) */
export async function checkApproachingDeadlines() {
  const now = new Date()
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const approaching = await db.taxAssignment.findMany({
    where: {
      status: 'ASSIGNED',
      dueDate: { gte: now, lte: weekLater },
    },
    include: { taxPayer: true },
  })

  let count = 0
  for (const assignment of approaching) {
    const existing = await db.notification.findFirst({
      where: {
        type: 'DEADLINE_WARNING',
        relatedType: 'ASSIGNMENT',
        relatedId: assignment.id,
      },
    })
    if (existing) continue

    if (assignment.assignedByStaffId) {
      await notifyStaff(
        assignment.assignedByStaffId,
        'DEADLINE_WARNING',
        `Deadline Approaching: ${assignment.referenceNo}`,
        `Assignment ${assignment.referenceNo} for ${assignment.taxPayer.fullName} (ETB ${assignment.amountDue}) is due on ${assignment.dueDate?.toLocaleDateString('en-GB')}.`,
        'HIGH',
        'ASSIGNMENT',
        assignment.id,
      )
    }
    count++
  }
  return count
}

/** Check for overdue assignments (past due date, still ASSIGNED) */
export async function checkOverdueAssignments() {
  const now = new Date()
  const overdue = await db.taxAssignment.findMany({
    where: {
      status: 'ASSIGNED',
      dueDate: { lt: now },
    },
    include: { taxPayer: true },
  })

  let count = 0
  for (const assignment of overdue) {
    const existing = await db.notification.findFirst({
      where: {
        type: 'OVERDUE',
        relatedType: 'ASSIGNMENT',
        relatedId: assignment.id,
      },
    })
    if (existing) continue

    // Notify the assigner
    if (assignment.assignedByStaffId) {
      await notifyStaff(
        assignment.assignedByStaffId,
        'OVERDUE',
        `Overdue: ${assignment.referenceNo}`,
        `Assignment ${assignment.referenceNo} for ${assignment.taxPayer.fullName} (ETB ${assignment.amountDue}) is OVERDUE. Due date was ${assignment.dueDate?.toLocaleDateString('en-GB')}.`,
        'CRITICAL',
        'ASSIGNMENT',
        assignment.id,
      )
    }
    count++
  }
  return count
}
