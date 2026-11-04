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
import { useRole } from './role-context'
import {
  TAX_CATEGORIES,
  fmtDate,
  fmtETB,
  categoryLabel,
} from './lib'
import {
  UserPlus,
  Search,
  Pencil,
  Trash2,
  Users,
  Phone,
  Mail,
  MapPin,
  X,
  ShieldOff,
  ShieldCheck,
  AlertTriangle,
  Landmark,
  UserCircle,
} from 'lucide-react'

interface Woreda {
  id: string
  code: string
  name: string
}

interface TaxPayer {
  id: string
  tin: string
  fullName: string
  category: string
  phone?: string | null
  email?: string | null
  address?: string | null
  woredaId?: string | null
  woreda?: Woreda | null
  kebele?: string | null
  tradeLicenseNo?: string | null
  contactPerson?: string | null
  notes?: string | null
  active: boolean
  blocked: boolean
  blockedReason?: string | null
  blockedAt?: string | null
  createdAt: string
  _count?: { assignments: number }
  assignments?: Array<{
    id: string
    referenceNo: string
    status: string
    amountDue: number
    taxType: string
    fiscalYear: string
    period: string
  }>
}

const emptyForm = {
  tin: '',
  fullName: '',
  category: 'BUSINESS',
  phone: '',
  email: '',
  address: '',
  woredaId: '',
  kebele: '',
  tradeLicenseNo: '',
  contactPerson: '',
  notes: '',
}

export function TaxPayers() {
  const { role, staffId, staffName } = useRole()
  const canEdit = role === 'LEADER' || role === 'TEAM_1_ASSIGNMENT'
  const isLeader = role === 'LEADER'
  const { toast } = useToast()
  const [list, setList] = useState<TaxPayer[]>([])
  const [woredas, setWoredas] = useState<Woreda[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [showBlocked, setShowBlocked] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<TaxPayer | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [detail, setDetail] = useState<TaxPayer | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    if (!showBlocked) params.set('blocked', 'false')
    fetch(`/api/taxpayers?${params}`)
      .then((r) => r.json())
      .then((d) => setList(d))
      .finally(() => setLoading(false))
  }, [q, category, showBlocked])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    fetch('/api/woredas')
      .then((r) => r.json())
      .then((d) => setWoredas(d))
  }, [])

  const openCreate = () => {
    setForm(emptyForm)
    setEditing(null)
    setCreateOpen(true)
  }

  const openEdit = (tp: TaxPayer) => {
    setEditing(tp)
    setForm({
      tin: tp.tin,
      fullName: tp.fullName,
      category: tp.category,
      phone: tp.phone || '',
      email: tp.email || '',
      address: tp.address || '',
      woredaId: tp.woredaId || '',
      kebele: tp.kebele || '',
      tradeLicenseNo: tp.tradeLicenseNo || '',
      contactPerson: tp.contactPerson || '',
      notes: tp.notes || '',
    })
    setCreateOpen(true)
  }

  const openDetail = (tp: TaxPayer) => {
    setDetail(tp)
    setDetailLoading(true)
    fetch(`/api/taxpayers/${tp.id}`)
      .then((r) => r.json())
      .then((d) => setDetail(d))
      .finally(() => setDetailLoading(false))
  }

  const save = async () => {
    if (!form.tin || !form.fullName || !form.category) {
      toast({
        title: 'Missing fields',
        description: 'TIN, Full Name, and Category are required.',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(
        editing ? `/api/taxpayers/${editing.id}` : '/api/taxpayers',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      toast({
        title: editing ? 'Tax payer updated' : 'Tax payer added',
        description: `${data.fullName} (${data.tin})`,
      })
      setCreateOpen(false)
      load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async (tp: TaxPayer) => {
    if (!confirm(`Deactivate tax payer ${tp.fullName}?`)) return
    const res = await fetch(`/api/taxpayers/${tp.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Tax payer deactivated', description: tp.fullName })
      load()
    }
  }

  const toggleBlock = async (tp: TaxPayer) => {
    if (tp.blocked) {
      if (!confirm(`Unblock tax payer ${tp.fullName}?`)) return
      const res = await fetch(`/api/taxpayers/${tp.id}/block`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked: false }),
      })
      if (res.ok) {
        toast({ title: 'Tax payer unblocked', description: tp.fullName })
        load()
        if (detail && detail.id === tp.id) openDetail(tp)
      }
    } else {
      const reason = prompt(`Block tax payer ${tp.fullName}? Enter reason:`)
      if (reason === null) return
      const res = await fetch(`/api/taxpayers/${tp.id}/block`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocked: true,
          reason,
          blockedByStaffId: staffId,
        }),
      })
      if (res.ok) {
        toast({ title: 'Tax payer blocked', description: tp.fullName })
        load()
        if (detail && detail.id === tp.id) openDetail(tp)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by TIN, name, phone, or trade license..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category || 'ALL'} onValueChange={(v) => setCategory(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {TAX_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showBlocked ? 'default' : 'outline'}
          onClick={() => setShowBlocked((v) => !v)}
          className="gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          {showBlocked ? 'Showing blocked' : 'Hide blocked'}
        </Button>
        {canEdit && (
          <Button onClick={openCreate} className="gap-2">
            <UserPlus className="h-4 w-4" /> Add Tax Payer
          </Button>
        )}
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Tax Payer Registry
            <Badge variant="secondary" className="ml-1">
              {loading ? '…' : list.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No tax payers found. {canEdit && 'Click "Add Tax Payer" to create the first one.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-y bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">TIN</th>
                      <th className="px-4 py-2 text-left font-medium">Name</th>
                      <th className="px-4 py-2 text-left font-medium">Category</th>
                      <th className="px-4 py-2 text-left font-medium">Contact</th>
                      <th className="px-4 py-2 text-left font-medium">Woreda</th>
                      <th className="px-4 py-2 text-center font-medium">Assignments</th>
                      <th className="px-4 py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {list.map((tp) => (
                      <tr
                        key={tp.id}
                        className="hover:bg-muted/40 cursor-pointer"
                        onClick={() => openDetail(tp)}
                      >
                        <td className="px-4 py-3 font-mono text-xs">{tp.tin}</td>
                        <td className="px-4 py-3 font-medium">
                          {tp.fullName}
                          {tp.blocked && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Blocked
                            </Badge>
                          )}
                          {!tp.active && !tp.blocked && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Inactive
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{categoryLabel(tp.category)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {tp.phone || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {tp.woreda ? `Woreda ${tp.woreda.code}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary">{tp._count?.assignments || 0}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            {isLeader && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleBlock(tp)}
                                title={tp.blocked ? 'Unblock' : 'Block'}
                              >
                                {tp.blocked ? (
                                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <ShieldOff className="h-3.5 w-3.5 text-rose-600" />
                                )}
                              </Button>
                            )}
                            {canEdit && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEdit(tp)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deactivate(tp)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {list.map((tp) => (
                  <button
                    key={tp.id}
                    onClick={() => openDetail(tp)}
                    className="block w-full text-left p-4 hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{tp.fullName}</p>
                        <p className="text-xs text-muted-foreground font-mono">{tp.tin}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline">{categoryLabel(tp.category)}</Badge>
                        {tp.blocked && (
                          <Badge variant="destructive" className="text-[10px]">
                            Blocked
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {tp.phone || '—'}
                      </span>
                      {tp.woreda && <Badge variant="secondary">Woreda {tp.woreda.code}</Badge>}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Tax Payer' : 'Add New Tax Payer'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the tax payer details below.'
                : 'Register a new tax payer in the Bishoftu Finance registry.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>TIN (Tax ID) *</Label>
              <Input
                value={form.tin}
                onChange={(e) => setForm({ ...form, tin: e.target.value })}
                placeholder="BT-0011-2026"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Full Name / Business Name *</Label>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="e.g. Bekele Tadesse"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+2519..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Woreda (sub-city)</Label>
              <Select
                value={form.woredaId || 'NONE'}
                onValueChange={(v) => setForm({ ...form, woredaId: v === 'NONE' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select woreda..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— None —</SelectItem>
                  {woredas.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kebele</Label>
              <Input
                value={form.kebele}
                onChange={(e) => setForm({ ...form, kebele: e.target.value })}
                placeholder="03"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Trade License No.</Label>
              <Input
                value={form.tradeLicenseNo}
                onChange={(e) => setForm({ ...form, tradeLicenseNo: e.target.value })}
                placeholder="BL-XXX-YYYY"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Person</Label>
              <Input
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="e.g. Ato Bekele"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street, landmark, etc."
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any internal note"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Tax Payer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle>{detail.fullName}</SheetTitle>
                <SheetDescription className="font-mono">{detail.tin}</SheetDescription>
              </SheetHeader>
              <div className="px-4 space-y-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{categoryLabel(detail.category)}</Badge>
                  {detail.active ? (
                    <Badge className="bg-emerald-500">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                  {detail.blocked && <Badge variant="destructive">Blocked</Badge>}
                </div>

                {detail.blocked && (
                  <div className="rounded-md border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 text-sm">
                    <p className="flex items-center gap-2 font-medium text-rose-700 dark:text-rose-300">
                      <ShieldOff className="h-4 w-4" /> Blocked
                    </p>
                    {detail.blockedReason && (
                      <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                        {detail.blockedReason}
                      </p>
                    )}
                    {detail.blockedAt && (
                      <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                        On {fmtDate(detail.blockedAt)}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  {detail.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{detail.phone}</span>
                    </div>
                  )}
                  {detail.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{detail.email}</span>
                    </div>
                  )}
                  {(detail.address || detail.woreda || detail.kebele) && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        {detail.address && <p>{detail.address}</p>}
                        {detail.woreda && (
                          <p className="text-xs text-muted-foreground">
                            <Landmark className="h-3 w-3 inline mr-1" />
                            {detail.woreda.name}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Kebele {detail.kebele || '—'}
                        </p>
                      </div>
                    </div>
                  )}
                  {detail.tradeLicenseNo && (
                    <div className="flex items-center gap-2">
                      <FileIcon className="h-4 w-4 text-muted-foreground" />
                      <span>Trade License: <span className="font-mono">{detail.tradeLicenseNo}</span></span>
                    </div>
                  )}
                  {detail.contactPerson && (
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <span>Contact: {detail.contactPerson}</span>
                    </div>
                  )}
                  {detail.notes && (
                    <div className="text-xs text-muted-foreground italic">
                      Notes: {detail.notes}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground pt-2">
                    Registered on {fmtDate(detail.createdAt)}
                  </p>
                </div>

                <div className="border-t pt-3">
                  <h4 className="text-sm font-semibold mb-2">Tax Assignments</h4>
                  {detailLoading ? (
                    <Skeleton className="h-20" />
                  ) : detail.assignments && detail.assignments.length > 0 ? (
                    <ul className="space-y-2 max-h-72 overflow-y-auto">
                      {detail.assignments.map((a) => (
                        <li
                          key={a.id}
                          className="rounded-md border border-border/60 p-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-medium">{a.referenceNo}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {a.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mt-0.5">
                            {a.taxType} · {a.fiscalYear} {a.period} · {fmtETB(a.amountDue)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No tax assignments yet.
                    </p>
                  )}
                </div>
              </div>
              <SheetFooter className="flex-col gap-2 sm:flex-row">
                {canEdit && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      setDetail(null)
                      openEdit(detail)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                )}
                {isLeader && (
                  <Button
                    variant={detail.blocked ? 'default' : 'outline'}
                    className="gap-2"
                    onClick={() => toggleBlock(detail)}
                  >
                    {detail.blocked ? (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" /> Unblock
                      </>
                    ) : (
                      <>
                        <ShieldOff className="h-3.5 w-3.5" /> Block
                      </>
                    )}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setDetail(null)}>
                  <X className="h-4 w-4" /> Close
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function FileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  )
}
