'use client'

import { createContext, useContext, ReactNode } from 'react'
import { Role } from './lib'
import type { SessionUser } from './app-shell'

interface RoleCtx {
  user: SessionUser
  role: Role
  staffId: string
  staffName: string
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
