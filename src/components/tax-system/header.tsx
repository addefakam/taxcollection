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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, ChevronDown, User, Shield } from 'lucide-react'

export function Header() {
  const { role, setRole, staffName, setStaffName } = useRole()
  const [nameInput, setNameInput] = useState(staffName)

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

        {/* Role switcher */}
        <div className="flex items-center gap-2">
          <Label htmlFor="role-select" className="text-xs text-muted-foreground hidden sm:block">
            Acting as:
          </Label>
          <Select
            value={role}
            onValueChange={(v) => setRole(v as Role)}
          >
            <SelectTrigger id="role-select" className="w-[200px] sm:w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LEADER">
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Finance Leader
                </span>
              </SelectItem>
              <SelectItem value="TEAM_1_ASSIGNMENT">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Team 1 — Assignment
                </span>
              </SelectItem>
              <SelectItem value="TEAM_2_FINANCE">
                <span className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Team 2 — Finance Office
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Staff name */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {staffName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline">{staffName}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Your staff name</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Alemu T."
              />
              <Button
                size="sm"
                className="w-full mt-2"
                onClick={() => setStaffName(nameInput.trim() || 'Staff')}
              >
                Save
              </Button>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-muted-foreground">
              {ROLES[role].description}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
