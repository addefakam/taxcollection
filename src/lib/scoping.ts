import { db } from './db'
import { getSession, SessionUser } from './auth'

/**
 * Returns a Prisma where-clause filter for taxpayers based on the user's
 * hierarchical scope. This ensures users only see data within their
 * administrative unit.
 *
 * - SYSTEM_ADMIN, CITY_ADMIN, LEADER: no filter (see everything)
 * - SUBCITY_ADMIN: filter by woreda.subCityId = their assignedSubCityId
 * - WOREDA_ADMIN, DATA_COLLECTOR: filter by woredaId = their assignedWoredaId
 * - TEAM_LEAD, TEAM_MEMBER: filter by their team's woredaId (looked up from Team)
 */
export async function getTaxPayerScopeFilter(): Promise<Record<string, unknown> | null> {
  const user = await getSession()
  if (!user) return null

  // City-wide roles see everything
  if (['SYSTEM_ADMIN', 'CITY_ADMIN', 'LEADER', 'CITY_REVENUE_OFFICER'].includes(user.role)) {
    return {}
  }

  // Sub-city scoped: see all woredas under their sub-city
  if (user.role === 'SUBCITY_ADMIN' && user.assignedSubCityId) {
    return { woreda: { subCityId: user.assignedSubCityId } }
  }

  // Woreda scoped: see only their woreda
  if (['WOREDA_ADMIN', 'DATA_COLLECTOR'].includes(user.role) && user.assignedWoredaId) {
    return { woredaId: user.assignedWoredaId }
  }

  // Team scoped: look up the team's woreda
  if (['TEAM_LEAD', 'TEAM_MEMBER'].includes(user.role) && user.teamId) {
    const team = await db.team.findUnique({
      where: { id: user.teamId },
      select: { woredaId: true },
    })
    if (team?.woredaId) {
      return { woredaId: team.woredaId }
    }
    return { id: '__none__' } // team has no woreda → see nothing
  }

  // No scope → see nothing (user needs to be assigned)
  return { id: '__none__' }
}

/**
 * Returns a Prisma where-clause filter for tax assignments based on the
 * user's hierarchical scope (filters via the taxPayer relation).
 */
export async function getAssignmentScopeFilter(): Promise<Record<string, unknown> | null> {
  const user = await getSession()
  if (!user) return null

  if (['SYSTEM_ADMIN', 'CITY_ADMIN', 'LEADER', 'CITY_REVENUE_OFFICER'].includes(user.role)) {
    return {}
  }

  if (user.role === 'SUBCITY_ADMIN' && user.assignedSubCityId) {
    return { taxPayer: { woreda: { subCityId: user.assignedSubCityId } } }
  }

  if (['WOREDA_ADMIN', 'DATA_COLLECTOR'].includes(user.role) && user.assignedWoredaId) {
    return { taxPayer: { woredaId: user.assignedWoredaId } }
  }

  if (['TEAM_LEAD', 'TEAM_MEMBER'].includes(user.role) && user.teamId) {
    const team = await db.team.findUnique({
      where: { id: user.teamId },
      select: { woredaId: true },
    })
    if (team?.woredaId) {
      return { taxPayer: { woredaId: team.woredaId } }
    }
    return { id: '__none__' }
  }

  return { id: '__none__' }
}

/**
 * Returns the list of woreda IDs visible to the current user.
 * Useful for revenue/stats scoping.
 */
export async function getVisibleWoredaIds(): Promise<string[] | null> {
  const user = await getSession()
  if (!user) return null

  // City-wide roles → null means "all woredas" (no filter)
  if (['SYSTEM_ADMIN', 'CITY_ADMIN', 'LEADER', 'CITY_REVENUE_OFFICER'].includes(user.role)) {
    return null // null = no filter (see all)
  }

  // Sub-city scoped → get all woredas under their sub-city
  if (user.role === 'SUBCITY_ADMIN' && user.assignedSubCityId) {
    const woredas = await db.woreda.findMany({
      where: { subCityId: user.assignedSubCityId, active: true },
      select: { id: true },
    })
    return woredas.map(w => w.id)
  }

  // Woreda scoped → just their woreda
  if (['WOREDA_ADMIN', 'DATA_COLLECTOR'].includes(user.role) && user.assignedWoredaId) {
    return [user.assignedWoredaId]
  }

  // Team scoped → their team's woreda
  if (['TEAM_LEAD', 'TEAM_MEMBER'].includes(user.role) && user.teamId) {
    const team = await db.team.findUnique({
      where: { id: user.teamId },
      select: { woredaId: true },
    })
    return team?.woredaId ? [team.woredaId] : []
  }

  return [] // empty = see nothing
}

/**
 * Check if the current user can access a specific woreda's data.
 * Returns true if the woreda is within their scope.
 */
export async function canAccessWoreda(woredaId: string): Promise<boolean> {
  const user = await getSession()
  if (!user) return false

  if (['SYSTEM_ADMIN', 'CITY_ADMIN', 'LEADER', 'CITY_REVENUE_OFFICER'].includes(user.role)) {
    return true
  }

  if (user.role === 'SUBCITY_ADMIN' && user.assignedSubCityId) {
    const woreda = await db.woreda.findUnique({
      where: { id: woredaId },
      select: { subCityId: true },
    })
    return woreda?.subCityId === user.assignedSubCityId
  }

  if (['WOREDA_ADMIN', 'DATA_COLLECTOR'].includes(user.role)) {
    return user.assignedWoredaId === woredaId
  }

  if (['TEAM_LEAD', 'TEAM_MEMBER'].includes(user.role) && user.teamId) {
    const team = await db.team.findUnique({
      where: { id: user.teamId },
      select: { woredaId: true },
    })
    return team?.woredaId === woredaId
  }

  return false
}
