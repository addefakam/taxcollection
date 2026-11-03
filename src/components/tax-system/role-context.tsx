'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Role } from './lib'

interface StaffMember {
  id: string
  fullName: string
  email?: string | null
  role: Role
}

interface RoleCtx {
  role: Role
  setRole: (r: Role) => void
  staffName: string
  setStaffName: (n: string) => void
  staffId: string | null
  setStaffId: (id: string | null) => void
  staffList: StaffMember[]
  setStaffList: (s: StaffMember[]) => void
}

const Ctx = createContext<RoleCtx | null>(null)

function readFromStorage(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function RoleProvider({ children }: { children: ReactNode }) {
  // Lazy-init from localStorage on first client render
  const [role, setRole] = useState<Role>(() => {
    const r = readFromStorage('staffRole') as Role | null
    return r || 'LEADER'
  })
  const [staffName, setStaffName] = useState<string>(() => {
    return readFromStorage('staffName') || 'Leader'
  })
  const [staffId, setStaffId] = useState<string | null>(() => {
    return readFromStorage('staffId')
  })
  const [staffList, setStaffList] = useState<StaffMember[]>([])

  // Load staff list from API on mount
  useEffect(() => {
    let active = true
    const loadStaff = async () => {
      try {
        const r = await fetch('/api/staff?active=true')
        const data: StaffMember[] = await r.json()
        if (!active) return
        setStaffList(data)

        // Auto-pick the first staff matching current role if nothing is set
        if (!staffId && data.length > 0) {
          const match = data.find((s) => s.role === role) || data[0]
          setStaffId(match.id)
          setStaffName(match.fullName)
          setRole(match.role)
        }
      } catch {
        // ignore
      }
    }
    loadStaff()
    return () => {
      active = false
    }
  }, [])

  // Persist + auto-update role when staff changes
  const handleSetStaffId = (id: string | null) => {
    setStaffId(id)
    if (id) {
      try {
        window.localStorage.setItem('staffId', id)
      } catch {
        // ignore
      }
      const match = staffList.find((s) => s.id === id)
      if (match) {
        setStaffName(match.fullName)
        setRole(match.role)
        try {
          window.localStorage.setItem('staffName', match.fullName)
          window.localStorage.setItem('staffRole', match.role)
        } catch {
          // ignore
        }
      }
    }
  }

  const handleSetRole = (r: Role) => {
    setRole(r)
    try {
      window.localStorage.setItem('staffRole', r)
    } catch {
      // ignore
    }
    // When the user manually changes the role, auto-pick the first staff in that role
    const match = staffList.find((s) => s.role === r)
    if (match) {
      setStaffId(match.id)
      setStaffName(match.fullName)
      try {
        window.localStorage.setItem('staffId', match.id)
        window.localStorage.setItem('staffName', match.fullName)
      } catch {
        // ignore
      }
    }
  }

  const handleSetStaffName = (n: string) => {
    setStaffName(n)
    try {
      window.localStorage.setItem('staffName', n)
    } catch {
      // ignore
    }
  }

  return (
    <Ctx.Provider
      value={{
        role,
        setRole: handleSetRole,
        staffName,
        setStaffName: handleSetStaffName,
        staffId,
        setStaffId: handleSetStaffId,
        staffList,
        setStaffList,
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
