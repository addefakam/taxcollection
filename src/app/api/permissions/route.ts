import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  ACTIONS,
  DEFAULT_PERMISSIONS,
  canPerform,
  invalidatePermissionCache,
} from '@/lib/permissions'
import { Role } from '@/components/tax-system/lib'

// GET /api/permissions — returns the full permission matrix
// Any logged-in staff can view (useful for the UI to know what to show/hide).
// But only SYSTEM_ADMIN can see the management page.
export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Load DB overrides
  const dbPerms = await db.permission.findMany()

  // Build matrix: start with defaults, override with DB values
  const roles: Role[] = [
    'SYSTEM_ADMIN',
    'LEADER',
    'CITY_REVENUE_OFFICER',
    'TEAM_1_ASSIGNMENT',
    'TEAM_2_FINANCE',
    'DATA_COLLECTOR',
  ]

  const matrix: Record<string, Record<string, boolean>> = {}
  for (const role of roles) {
    matrix[role] = { ...(DEFAULT_PERMISSIONS[role] || {}) }
  }
  for (const p of dbPerms) {
    if (!matrix[p.role]) matrix[p.role] = {}
    matrix[p.role][p.action] = p.allowed
  }

  // Also return the action definitions so the UI knows labels + categories
  return NextResponse.json({
    actions: ACTIONS,
    roles: roles.map((r) => ({ role: r, label: getRoleLabel(r) })),
    matrix,
    canManage: user.role === 'SYSTEM_ADMIN' || await canPerform(user.role, 'MANAGE_PERMISSIONS'),
    currentUser: user,
  })
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    SYSTEM_ADMIN: 'System Admin',
    LEADER: 'Finance Leader',
    CITY_REVENUE_OFFICER: 'City Revenue Officer',
    TEAM_1_ASSIGNMENT: 'Team 1 — Assignment',
    TEAM_2_FINANCE: 'Team 2 — Finance Office',
    DATA_COLLECTOR: 'Galmeessituu (Data Collector)',
  }
  return labels[role] || role
}

// PUT /api/permissions — update one or more permission cells
// Body: { changes: [{ role, action, allowed }] }
// Only SYSTEM_ADMIN (or anyone with MANAGE_PERMISSIONS) can do this.
export async function PUT(req: NextRequest) {
  const user = await getSession()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const canManage = user.role === 'SYSTEM_ADMIN' || await canPerform(user.role, 'MANAGE_PERMISSIONS')
  if (!canManage) {
    return NextResponse.json(
      { error: 'Forbidden: only the System Admin can manage permissions' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { changes } = body as { changes: Array<{ role: string; action: string; allowed: boolean }> }

  if (!Array.isArray(changes) || changes.length === 0) {
    return NextResponse.json({ error: 'changes array is required' }, { status: 400 })
  }

  // Prevent anyone from removing MANAGE_PERMISSIONS from SYSTEM_ADMIN
  // (otherwise they could lock themselves out)
  for (const c of changes) {
    if (c.role === 'SYSTEM_ADMIN' && c.action === 'MANAGE_PERMISSIONS' && !c.allowed) {
      return NextResponse.json(
        { error: 'Cannot remove MANAGE_PERMISSIONS from System Admin (would lock you out)' },
        { status: 400 }
      )
    }
  }

  // Apply changes via upsert
  for (const c of changes) {
    await db.permission.upsert({
      where: {
        role_action: { role: c.role, action: c.action },
      },
      update: {
        allowed: c.allowed,
        updatedBy: user.id,
      },
      create: {
        role: c.role,
        action: c.action,
        allowed: c.allowed,
        updatedBy: user.id,
      },
    })
  }

  // Invalidate cache so changes take effect immediately
  invalidatePermissionCache()

  return NextResponse.json({
    ok: true,
    updated: changes.length,
    message: `Updated ${changes.length} permission(s)`,
  })
}
