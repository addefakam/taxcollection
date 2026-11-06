'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'
import type { SessionUser } from './app-shell'
import {
  UserPlus,
  Users,
  Mail,
  Phone,
  KeyRound,
  Trash2,
  Pencil,
  Shield,
  Clock,
  Copy,
  CheckCircle2,
  MapPin,
} from 'lucide-react'
import { fmtDate } from './lib'

interface Woreda {
  id: string
  code: string
  name: string
}

interface StaffMember {
  id: string
  fullName: string
  email: string
  phone?: string | null
  role: 'LEADER' | 'TEAM_1_ASSIGNMENT' | 'TEAM_2_FINANCE' | 'CITY_REVENUE_OFFICER' | 'DATA_COLLECTOR'
  active: boolean
  assignedWoredaId?: string | null
  assignedWoreda?: { id: string; code: string; name: string } | null
  lastLoginAt?: string | null
  createdAt: string
}

const ROLE_LABEL: Record<string, string> = {
  LEADER: 'Finance Leader',
  TEAM_1_ASSIGNMENT: 'Team 1 — Assignment',
  TEAM_2_FINANCE: 'Team 2 — Finance Office',
  CITY_REVENUE_OFFICER: 'City Revenue Officer',
  DATA_COLLECTOR: 'Galmeessituu (Data Collector)',
}

const ROLE_TONE: Record<string, string> = {
  LEADER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  TEAM_1_ASSIGNMENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  TEAM_2_FINANCE: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  CITY_REVENUE_OFFICER: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  DATA_COLLECTOR: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
}

const emptyForm = {
  fullName: '',
  email: '',
  phone: '',
  role: 'TEAM_1_ASSIGNMENT' as StaffMember['role'],
  password: '',
  assignedWoredaId: 'NONE',
}

export function StaffManagement({ currentUser }: { currentUser: SessionUser }) {
  const { toast } = useToast()
  const [list, setList] = useState<StaffMember[]>([])
  const [woredas, setWoredas] = useState<Woreda[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnlyCollectors, setShowOnlyCollectors] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [generatedPw, setGeneratedPw] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Reset password state
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null)
  const [resetSaving, setResetSaving] = useState(false)
  const [resetPw, setResetPw] = useState<string | null>(null)
  const [resetCopied, setResetCopied] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/staff')
      .then((r) => r.json())
      .then((d) => setList(d))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Load woredas (for the woreda dropdown when creating a Data Collector)
  useEffect(() => {
    fetch('/api/woredas')
      .then((r) => r.json())
      .then((d) => setWoredas(d))
      .catch(() => {})
  }, [])

  // Apply Galmeewwan filter: only show DATA_COLLECTOR accounts
  const displayList = showOnlyCollectors
    ? list.filter((s) => s.role === 'DATA_COLLECTOR')
    : list

  const openCreate = () => {
    setForm(emptyForm)
    setEditing(null)
    setGeneratedPw(null)
    setCreateOpen(true)
  }

  const openEdit = (s: StaffMember) => {
    setEditing(s)
    setForm({
      fullName: s.fullName,
      email: s.email,
      phone: s.phone || '',
      role: s.role,
      password: '',
      assignedWoredaId: s.assignedWoredaId || 'NONE',
    })
    setGeneratedPw(null)
    setCreateOpen(true)
  }

  const save = async () => {
    if (!form.fullName || !form.email || !form.role) {
      toast({
        title: 'Missing fields',
        description: 'Name, email and role are required.',
        variant: 'destructive',
      })
      return
    }
    // Validate that DATA_COLLECTOR has an assigned woreda
    if (form.role === 'DATA_COLLECTOR' && (form.assignedWoredaId === 'NONE' || !form.assignedWoredaId)) {
      toast({
        title: 'Missing woreda',
        description: 'Data Collectors (Galmeewwan) must be assigned to a woreda.',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        role: form.role,
        password: form.password || undefined,
        assignedWoredaId:
          form.role === 'DATA_COLLECTOR' && form.assignedWoredaId !== 'NONE'
            ? form.assignedWoredaId
            : undefined,
      }
      const res = await fetch(
        editing ? `/api/staff/${editing.id}` : '/api/staff',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      toast({
        title: editing ? 'Staff updated' : 'Staff added',
        description: editing
          ? `${data.fullName} updated.`
          : `${data.fullName} added.${
              data.generatedPassword
                ? ` Temporary password: ${data.generatedPassword}`
                : ''
            }`,
      })
      if (!editing && data.generatedPassword) {
        setGeneratedPw(data.generatedPassword)
      } else {
        setCreateOpen(false)
      }
      load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async (s: StaffMember) => {
    if (s.id === currentUser.id) {
      toast({
        title: 'Cannot deactivate yourself',
        description: 'Ask another Leader to deactivate your account.',
        variant: 'destructive',
      })
      return
    }
    if (!confirm(`Deactivate staff member ${s.fullName}? They will not be able to log in.`))
      return
    const res = await fetch(`/api/staff/${s.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Staff deactivated', description: s.fullName })
      load()
    }
  }

  const openReset = (s: StaffMember) => {
    setResetTarget(s)
    setResetPw(null)
    setResetCopied(false)
  }

  const resetPassword = async () => {
    if (!resetTarget) return
    setResetSaving(true)
    try {
      const res = await fetch(`/api/staff/${resetTarget.id}/reset-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setResetPw(data.generatedPassword)
      toast({
        title: 'Password reset',
        description: 'Share the new password with the staff member securely.',
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setResetSaving(false)
    }
  }

  const copyToClipboard = (text: string, what: 'gen' | 'reset') => {
    navigator.clipboard.writeText(text)
    if (what === 'gen') setCopied(true)
    else setResetCopied(true)
    setTimeout(() => {
      if (what === 'gen') setCopied(false)
      else setResetCopied(false)
    }, 2000)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Staff Members</h2>
          <p className="text-sm text-muted-foreground">
            Add new staff, reset passwords, or deactivate accounts. The first
            Leader account was seeded at setup.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={showOnlyCollectors ? 'default' : 'outline'}
            onClick={() => setShowOnlyCollectors((v) => !v)}
            className="gap-2"
            title="Show only Data Collector (Galmeewwan) accounts"
          >
            <MapPin className="h-4 w-4" />
            Galmeewwan
            {showOnlyCollectors && (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {displayList.length}
              </Badge>
            )}
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <UserPlus className="h-4 w-4" /> Add Staff
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            {showOnlyCollectors ? 'Galmeewwan (Data Collectors)' : 'All Staff'}
            <Badge variant="secondary" className="ml-1">
              {loading ? '…' : displayList.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : displayList.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No staff members.</p>
            </div>
          ) : (
            <div className="divide-y">
              {displayList.map((s) => (
                <div key={s.id} className="p-4 hover:bg-muted/40">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-medium">{s.fullName}</p>
                        {s.id === currentUser.id && (
                          <Badge variant="outline" className="text-[10px]">
                            You
                          </Badge>
                        )}
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_TONE[s.role]}`}
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          {ROLE_LABEL[s.role]}
                        </span>
                        {s.role === 'DATA_COLLECTOR' && s.assignedWoreda && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <MapPin className="h-3 w-3 mr-1" />
                            Woreda {s.assignedWoreda.code}
                          </span>
                        )}
                        {!s.active && (
                          <Badge variant="secondary" className="text-[10px]">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {s.email}
                        </span>
                        {s.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {s.phone}
                          </span>
                        )}
                        {s.role === 'DATA_COLLECTOR' && s.assignedWoreda && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {s.assignedWoreda.name}
                          </span>
                        )}
                        {s.lastLoginAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Last login: {fmtDate(s.lastLoginAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => openReset(s)}
                      >
                        <KeyRound className="h-3.5 w-3.5" /> Reset Password
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {s.id !== currentUser.id && s.active && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deactivate(s)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => !o && setCreateOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit Staff Member' : 'Add New Staff Member'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the staff member details below.'
                : 'Create a new account. If no password is set, a temporary one will be auto-generated and shown once.'}
            </DialogDescription>
          </DialogHeader>

          {generatedPw ? (
            <div className="space-y-3">
              <div className="rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Account created!
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  Temporary password for{' '}
                  <span className="font-medium">{form.email}</span>:
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded bg-background px-3 py-2 text-sm font-mono border">
                    {generatedPw}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedPw, 'gen')}
                  >
                    {copied ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this password securely with the staff member. They can
                  change it after logging in.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="e.g. Ato Bekele T."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="bekele@bishoftu.gov.et"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+2519..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role *</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) =>
                      setForm({ ...form, role: v as StaffMember['role'] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEADER">Finance Leader</SelectItem>
                      <SelectItem value="TEAM_1_ASSIGNMENT">Team 1 — Assignment</SelectItem>
                      <SelectItem value="TEAM_2_FINANCE">Team 2 — Finance Office</SelectItem>
                      <SelectItem value="CITY_REVENUE_OFFICER">City Revenue Officer</SelectItem>
                      <SelectItem value="DATA_COLLECTOR">Galmeessituu (Data Collector)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Woreda selector — only visible when role is DATA_COLLECTOR */}
              {form.role === 'DATA_COLLECTOR' && (
                <div className="space-y-1.5">
                  <Label>Assigned Woreda (Sub-city) *</Label>
                  <Select
                    value={form.assignedWoredaId}
                    onValueChange={(v) => setForm({ ...form, assignedWoredaId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a woreda..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">— Select a woreda —</SelectItem>
                      {woredas.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The Data Collector will only see taxpayers and assignments
                    in this woreda. They cannot view or create data for other woredas.
                  </p>
                </div>
              )}
              {!editing && (
                <div className="space-y-1.5">
                  <Label>Password (optional)</Label>
                  <Input
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Leave blank to auto-generate"
                  />
                  <p className="text-xs text-muted-foreground">
                    If left blank, a temporary password will be generated and shown after creation.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {generatedPw ? (
              <Button onClick={() => setCreateOpen(false)}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={save} disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Staff'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password sheet */}
      <Sheet open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {resetTarget && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  Reset Password
                </SheetTitle>
                <SheetDescription>
                  For <span className="font-medium">{resetTarget.fullName}</span> ({resetTarget.email})
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4 space-y-4">
                {!resetPw ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      This will generate a new random temporary password. The
                      old password will stop working immediately.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      The staff member should change it after logging in.
                    </p>
                  </>
                ) : (
                  <div className="rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 space-y-2">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Password reset!
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      New temporary password:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded bg-background px-3 py-2 text-sm font-mono border">
                        {resetPw}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(resetPw, 'reset')}
                      >
                        {resetCopied ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <SheetFooter>
                {!resetPw ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setResetTarget(null)}
                      disabled={resetSaving}
                    >
                      Cancel
                    </Button>
                    <Button onClick={resetPassword} disabled={resetSaving}>
                      {resetSaving ? 'Resetting…' : 'Reset Password'}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setResetTarget(null)}>Done</Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
