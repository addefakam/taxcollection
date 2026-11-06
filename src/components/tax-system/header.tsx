'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Building2, ChevronDown, LogOut, KeyRound, Mail, Shield, MapPin } from 'lucide-react'
import { useState } from 'react'
import type { SessionUser } from './app-shell'
import { ROLES, Role } from './lib'

const ROLE_LABEL: Record<Role, string> = {
  LEADER: 'Finance Leader',
  TEAM_1_ASSIGNMENT: 'Team 1 — Assignment',
  TEAM_2_FINANCE: 'Team 2 — Finance Office',
  CITY_REVENUE_OFFICER: 'City Revenue Officer',
  DATA_COLLECTOR: 'Galmeessituu',
}

interface HeaderProps {
  user: SessionUser
  onLogout: () => void
}

export function Header({ user, onLogout }: HeaderProps) {
  const { toast } = useToast()
  const [pwOpen, setPwOpen] = useState(false)
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  const changePassword = async () => {
    if (newPw.length < 8) {
      toast({
        title: 'Password too short',
        description: 'New password must be at least 8 characters.',
        variant: 'destructive',
      })
      return
    }
    if (newPw !== confirmPw) {
      toast({
        title: 'Passwords do not match',
        description: 'Please re-enter the same password twice.',
        variant: 'destructive',
      })
      return
    }
    setPwSaving(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: curPw,
          newPassword: newPw,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast({
        title: 'Password changed',
        description: 'You can continue using the system normally.',
      })
      setPwOpen(false)
      setCurPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <>
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

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[140px] truncate">
                  {user.fullName}
                </span>
                <Badge variant="secondary" className="text-[10px] hidden md:inline">
                  {ROLE_LABEL[user.role]}
                </Badge>
                {user.role === 'DATA_COLLECTOR' && user.assignedWoredaCode && (
                  <Badge
                    variant="outline"
                    className="text-[10px] hidden md:inline bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                  >
                    Woreda {user.assignedWoredaCode}
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="flex flex-col gap-1">
                <span>{user.fullName}</span>
                <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {user.email}
                </span>
                <Badge variant="secondary" className="text-[10px] w-fit mt-1">
                  <Shield className="h-3 w-3 mr-1" />
                  {ROLES[user.role].label}
                </Badge>
                {user.role === 'DATA_COLLECTOR' && user.assignedWoredaName && (
                  <Badge
                    variant="outline"
                    className="text-[10px] w-fit mt-1 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    {user.assignedWoredaName}
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPwOpen(true)} className="gap-2 cursor-pointer">
                <KeyRound className="h-4 w-4" /> Change password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onLogout}
                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Change password dialog */}
      <Dialog open={pwOpen} onOpenChange={setPwOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Pick a new password. It must be at least 8 characters long.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwOpen(false)} disabled={pwSaving}>
              Cancel
            </Button>
            <Button onClick={changePassword} disabled={pwSaving || !curPw || !newPw}>
              {pwSaving ? 'Saving…' : 'Change Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
