'use client'

import { createContext, useContext, ReactNode } from 'react'
import { Role } from './lib'
import type { SessionUser } from './app-shell'

interface RoleCtx {
  user: SessionUser
  role: Role
  staffId: string
  staffName: string
  assignedSubCityId?: string | null
  assignedSubCityName?: string | null
  assignedWoredaId?: string | null
  assignedWoredaName?: string | null
  teamId?: string | null
  teamName?: string | null
}

const Ctx = createContext<RoleCtx | null>(null)

export function RoleProvider({
  user,
  children,
}: {
  user: SessionUser
  children: ReactNode
}) {
  return (
    <Ctx.Provider
      value={{
        user,
        role: user.role,
        staffId: user.id,
        staffName: user.fullName,
        assignedSubCityId: user.assignedSubCityId,
        assignedSubCityName: user.assignedSubCityName,
        assignedWoredaId: user.assignedWoredaId,
        assignedWoredaName: user.assignedWoredaName,
        teamId: user.teamId,
        teamName: user.teamName,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useRole() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useRole must be used within RoleProvider')
  return c
}
