'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { Role } from './lib'

interface RoleCtx {
  role: Role
  setRole: (r: Role) => void
  staffName: string
  setStaffName: (n: string) => void
}

const Ctx = createContext<RoleCtx | null>(null)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>('LEADER')
  const [staffName, setStaffName] = useState<string>('Leader')
  return (
    <Ctx.Provider value={{ role, setRole, staffName, setStaffName }}>
      {children}
    </Ctx.Provider>
  )
}

export function useRole() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useRole must be used within RoleProvider')
  return c
}
