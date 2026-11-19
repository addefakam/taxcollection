// System permission definitions + helper functions.
// The System Admin can toggle these per role from the Permissions Management UI.

import { db } from './db'
import { getSession } from './auth'

// ---- All system actions ----------------------------------------------------

export type PermissionAction =
  | 'VIEW_DASHBOARD'
  | 'VIEW_TAXPAYERS'
  | 'ADD_TAXPAYER'
  | 'EDIT_TAXPAYER'
  | 'BLOCK_TAXPAYER'
  | 'VIEW_ASSIGNMENTS'
  | 'CREATE_ASSIGNMENT'
  | 'EDIT_ASSIGNMENT'
  | 'RECEIVE_BANK_RECEIPT'
  | 'ISSUE_GOVERNMENT_RECEIPT'
  | 'MARK_DISPUTE'
  | 'CANCEL_ASSIGNMENT'
  | 'DELETE_ATTACHMENT'
  | 'VIEW_REVENUE'
  | 'VIEW_TAX_TARGETS'
  | 'SET_TAX_TARGETS'
  | 'VIEW_STAFF'
  | 'MANAGE_STAFF'
  | 'MANAGE_WOREDAS'
  | 'MANAGE_PERMISSIONS'

export interface ActionDef {
  key: PermissionAction
  label: string
  description: string
  category: string
}

export const ACTIONS: ActionDef[] = [
  // Dashboard
  { key: 'VIEW_DASHBOARD', label: 'View Dashboard', description: 'See the main dashboard with KPIs and stats', category: 'Dashboard' },

  // Tax Payers
  { key: 'VIEW_TAXPAYERS', label: 'View Tax Payers', description: 'See the taxpayer registry', category: 'Tax Payers' },
  { key: 'ADD_TAXPAYER', label: 'Add Tax Payer', description: 'Register new taxpayers', category: 'Tax Payers' },
  { key: 'EDIT_TAXPAYER', label: 'Edit Tax Payer', description: 'Update taxpayer details', category: 'Tax Payers' },
  { key: 'BLOCK_TAXPAYER', label: 'Block / Unblock Tax Payer', description: 'Suspend or reactivate taxpayers', category: 'Tax Payers' },

  // Assignments
  { key: 'VIEW_ASSIGNMENTS', label: 'View Assignments', description: 'See tax assignments', category: 'Assignments' },
  { key: 'CREATE_ASSIGNMENT', label: 'Create Assignment', description: 'Assign tax obligations to taxpayers', category: 'Assignments' },
  { key: 'EDIT_ASSIGNMENT', label: 'Edit Assignment', description: 'Modify assignment details (amount, due date)', category: 'Assignments' },
  { key: 'RECEIVE_BANK_RECEIPT', label: 'Receive Bank Receipt', description: 'Record bank receipt from taxpayer', category: 'Assignments' },
  { key: 'ISSUE_GOVERNMENT_RECEIPT', label: 'Issue Government Receipt', description: 'Issue official govt receipt (completes process)', category: 'Assignments' },
  { key: 'MARK_DISPUTE', label: 'Mark / Resolve Dispute', description: 'Flag assignment as disputed or resolve it', category: 'Assignments' },
  { key: 'CANCEL_ASSIGNMENT', label: 'Cancel Assignment', description: 'Cancel an assignment', category: 'Assignments' },
  { key: 'DELETE_ATTACHMENT', label: 'Delete Attachments', description: 'Delete uploaded bank receipt files', category: 'Assignments' },

  // Revenue
  { key: 'VIEW_REVENUE', label: 'View City Revenue', description: 'See revenue dashboard with expected vs collected', category: 'Revenue' },
  { key: 'VIEW_TAX_TARGETS', label: 'View Tax Targets', description: 'See yearly tax targets', category: 'Revenue' },
  { key: 'SET_TAX_TARGETS', label: 'Set / Edit Tax Targets', description: 'Create or modify yearly expected tax targets', category: 'Revenue' },

  // Staff & Admin
  { key: 'VIEW_STAFF', label: 'View Staff List', description: 'See the list of staff members', category: 'Staff & Admin' },
  { key: 'MANAGE_STAFF', label: 'Manage Staff', description: 'Add, edit, reset password, deactivate staff', category: 'Staff & Admin' },
  { key: 'MANAGE_WOREDAS', label: 'Manage Woredas', description: 'Add or edit woredas (sub-cities)', category: 'Staff & Admin' },
  { key: 'MANAGE_PERMISSIONS', label: 'Manage Permissions', description: 'Change what each role can do (System Admin only)', category: 'Staff & Admin' },
]

// ---- Default permission matrix ---------------------------------------------
// These defaults match the previous hardcoded rules.
// The System Admin can override them at runtime.

export const DEFAULT_PERMISSIONS: Record<string, Record<PermissionAction, boolean>> = {
  SYSTEM_ADMIN: Object.fromEntries(ACTIONS.map((a) => [a.key, true])) as Record<PermissionAction, boolean>,
  LEADER: {
    VIEW_DASHBOARD: true,
    VIEW_TAXPAYERS: true,
    ADD_TAXPAYER: true,
    EDIT_TAXPAYER: true,
    BLOCK_TAXPAYER: true,
    VIEW_ASSIGNMENTS: true,
    CREATE_ASSIGNMENT: true,
    EDIT_ASSIGNMENT: true,
    RECEIVE_BANK_RECEIPT: true,
    ISSUE_GOVERNMENT_RECEIPT: true,
    MARK_DISPUTE: true,
    CANCEL_ASSIGNMENT: true,
    DELETE_ATTACHMENT: true,
    VIEW_REVENUE: true,
    VIEW_TAX_TARGETS: true,
    SET_TAX_TARGETS: true,
    VIEW_STAFF: true,
    MANAGE_STAFF: true,
    MANAGE_WOREDAS: true,
    MANAGE_PERMISSIONS: false,
  },
  CITY_REVENUE_OFFICER: {
    VIEW_DASHBOARD: true,
    VIEW_TAXPAYERS: true,
    ADD_TAXPAYER: false,
    EDIT_TAXPAYER: false,
    BLOCK_TAXPAYER: false,
    VIEW_ASSIGNMENTS: true,
    CREATE_ASSIGNMENT: false,
    EDIT_ASSIGNMENT: false,
    RECEIVE_BANK_RECEIPT: false,
    ISSUE_GOVERNMENT_RECEIPT: false,
    MARK_DISPUTE: false,
    CANCEL_ASSIGNMENT: false,
    DELETE_ATTACHMENT: false,
    VIEW_REVENUE: true,
    VIEW_TAX_TARGETS: true,
    SET_TAX_TARGETS: false,
    VIEW_STAFF: false,
    MANAGE_STAFF: false,
    MANAGE_WOREDAS: false,
    MANAGE_PERMISSIONS: false,
  },
  TEAM_1_ASSIGNMENT: {
    VIEW_DASHBOARD: true,
    VIEW_TAXPAYERS: true,
    ADD_TAXPAYER: true,
    EDIT_TAXPAYER: true,
    BLOCK_TAXPAYER: false,
    VIEW_ASSIGNMENTS: true,
    CREATE_ASSIGNMENT: true,
    EDIT_ASSIGNMENT: false,
    RECEIVE_BANK_RECEIPT: false,
    ISSUE_GOVERNMENT_RECEIPT: false,
    MARK_DISPUTE: false,
    CANCEL_ASSIGNMENT: false,
    DELETE_ATTACHMENT: false,
    VIEW_REVENUE: false,
    VIEW_TAX_TARGETS: false,
    SET_TAX_TARGETS: false,
    VIEW_STAFF: false,
    MANAGE_STAFF: false,
    MANAGE_WOREDAS: false,
    MANAGE_PERMISSIONS: false,
  },
  TEAM_2_FINANCE: {
    VIEW_DASHBOARD: true,
    VIEW_TAXPAYERS: true,
    ADD_TAXPAYER: false,
    EDIT_TAXPAYER: false,
    BLOCK_TAXPAYER: false,
    VIEW_ASSIGNMENTS: true,
    CREATE_ASSIGNMENT: false,
    EDIT_ASSIGNMENT: false,
    RECEIVE_BANK_RECEIPT: true,
    ISSUE_GOVERNMENT_RECEIPT: true,
    MARK_DISPUTE: false,
    CANCEL_ASSIGNMENT: false,
    DELETE_ATTACHMENT: false,
    VIEW_REVENUE: false,
    VIEW_TAX_TARGETS: false,
    SET_TAX_TARGETS: false,
    VIEW_STAFF: false,
    MANAGE_STAFF: false,
    MANAGE_WOREDAS: false,
    MANAGE_PERMISSIONS: false,
  },
  DATA_COLLECTOR: {
    VIEW_DASHBOARD: true,
    VIEW_TAXPAYERS: true,
    ADD_TAXPAYER: true,
    EDIT_TAXPAYER: true,
    BLOCK_TAXPAYER: false,
    VIEW_ASSIGNMENTS: true,
    CREATE_ASSIGNMENT: true,
    EDIT_ASSIGNMENT: false,
    RECEIVE_BANK_RECEIPT: false,
    ISSUE_GOVERNMENT_RECEIPT: false,
    MARK_DISPUTE: false,
    CANCEL_ASSIGNMENT: false,
    DELETE_ATTACHMENT: false,
    VIEW_REVENUE: false,
    VIEW_TAX_TARGETS: false,
    SET_TAX_TARGETS: false,
    VIEW_STAFF: false,
    MANAGE_STAFF: false,
    MANAGE_WOREDAS: false,
    MANAGE_PERMISSIONS: false,
  },
}

// ---- Permission checking (with caching) ------------------------------------

let cache: {
  data: Record<string, Record<string, boolean>> // role -> action -> allowed
  loadedAt: number
} | null = null

const CACHE_TTL_MS = 10_000 // 10 seconds — short TTL so admin changes take effect quickly

async function loadPermissionMatrix(): Promise<Record<string, Record<string, boolean>>> {
  // Start with defaults
  const matrix: Record<string, Record<string, boolean>> = {}
  for (const [role, actions] of Object.entries(DEFAULT_PERMISSIONS)) {
    matrix[role] = { ...actions }
  }

  // Override with DB values
  const dbPerms = await db.permission.findMany()
  for (const p of dbPerms) {
    if (!matrix[p.role]) matrix[p.role] = {}
    matrix[p.role][p.action] = p.allowed
  }

  return matrix
}

async function getPermissionMatrix(): Promise<Record<string, Record<string, boolean>>> {
  const now = Date.now()
  if (cache && now - cache.loadedAt < CACHE_TTL_MS) {
    return cache.data
  }
  const data = await loadPermissionMatrix()
  cache = { data, loadedAt: now }
  return data
}

/** Check if a role can perform an action. Uses defaults if no DB override exists. */
export async function canPerform(
  role: string,
  action: PermissionAction
): Promise<boolean> {
  // SYSTEM_ADMIN can always do everything
  if (role === 'SYSTEM_ADMIN') return true

  const matrix = await getPermissionMatrix()
  const rolePerms = matrix[role]
  if (!rolePerms) return false
  return rolePerms[action] === true
}

/** Check if the current session user can perform an action.
 *  Returns 401 if not logged in, 403 if not permitted. */
export async function requirePermission(action: PermissionAction) {
  const user = await getSession()
  if (!user) {
    throw new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const allowed = await canPerform(user.role, action)
  if (!allowed) {
    throw new Response(
      JSON.stringify({
        error: `Forbidden: your role (${user.role}) does not have permission to ${action}`,
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
  return user
}

/** Invalidate the permission cache (call after updating permissions). */
export function invalidatePermissionCache() {
  cache = null
}
