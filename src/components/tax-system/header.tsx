'use client'

import { useState } from 'react'
import { useRole } from './role-context'
import { ROLES, Role } from './lib'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, ChevronDown, Shield, User, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const ROLE_LABEL: Record<Role, string> = {
  LEADER: 'Finance Leader',
  TEAM_1_ASSIGNMENT: 'Team 1 — Assignment',
  TEAM_2_FINANCE: 'Team 2 — Finance Office',
}

export function Header() {
  const { staffList, staffId, setStaffId, role, staffName } = useRole()
  const [open, setOpen] = useState(false)

  // Group staff by role for easier selection
  const grouped: Record<Role, typeof staffList> = {
    LEADER: staffList.filter((s) => s.role === 'LEADER'),
    TEAM_1_ASSIGNMENT: staffList.filter((s) => s.role === 'TEAM_1_ASSIGNMENT'),
    TEAM_2_FINANCE: staffList.filter((s) => s.role === 'TEAM_2_FINANCE'),
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 flex items-center gap-3 sm:gap-6 flex-wrap">
        {/* Logo + title */}
        <div className="flex items-center gap-3 mr-auto">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <h1 className="text-base sm:text-lg font-semibold tracking-tight">
              Bishoftu Finance
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Tax Collection Process Control
            </p>
          </div>
        </div>

        {/* Staff selector dropdown */}
        <div className="flex items-center gap-2">
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {(staffName || '?').charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[140px] truncate">{staffName}</span>
                <Badge variant="secondary" className="text-[10px] hidden md:inline">
                  {ROLE_LABEL[role]}
                </Badge>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Sign in as staff member
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-80 overflow-y-auto p-1">
                {staffList.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">
                    No staff loaded. Run the seed script.
                  </p>
                ) : (
                  (Object.keys(grouped) as Role[]).map((r) =>
                    grouped[r].length === 0 ? null : (
                      <div key={r} className="mb-2">
                        <p className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                          {r === 'LEADER' && <Shield className="h-3 w-3" />}
                          {r === 'TEAM_1_ASSIGNMENT' && <User className="h-3 w-3" />}
                          {r === 'TEAM_2_FINANCE' && <Building2 className="h-3 w-3" />}
                          {ROLE_LABEL[r]}
                        </p>
                        {grouped[r].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              setStaffId(s.id)
                              setOpen(false)
                            }}
                            className={`flex items-center justify-between w-full text-left px-2 py-1.5 rounded-md hover:bg-accent text-sm ${
                              staffId === s.id ? 'bg-accent' : ''
                            }`}
                          >
                            <span className="truncate">{s.fullName}</span>
                            {staffId === s.id && (
                              <span className="text-[10px] text-primary font-medium">
                                ✓ active
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )
                  )
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

// Keep Select-based fallback export for other code that might import ROLES
export function RoleSelect({
  value,
  onValueChange,
}: {
  value: Role
  onValueChange: (r: Role) => void
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as Role)}>
      <SelectTrigger className="w-[200px] sm:w-[260px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="LEADER">Finance Leader</SelectItem>
        <SelectItem value="TEAM_1_ASSIGNMENT">Team 1 — Assignment</SelectItem>
        <SelectItem value="TEAM_2_FINANCE">Team 2 — Finance Office</SelectItem>
      </SelectContent>
    </Select>
  )
}
