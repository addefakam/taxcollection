'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { fmtETB, fmtDateShort } from './lib'
import { CalendarDays, Plus, Pencil, Trash2, TrendingUp, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

interface Plan {
  id: string
  title: string
  description?: string | null
  periodType: string
  startDate: string
  endDate: string
  subCity?: { name: string } | null
  woreda?: { name: string } | null
  team?: { name: string } | null
  responsible?: { fullName: string } | null
  activity: string
  targetAmount?: number | null
  targetQuantity?: number | null
  expectedOutcome?: string | null
  priority: string
  status: string
  progress: number
  actualAmount?: number | null
  actualQuantity?: number | null
  remarks?: string | null
  challenges?: string | null
}

interface StaffOption { id: string; fullName: string }
interface SubCityOption { id: string; name: string }
interface WoredaOption { id: string; name: string }
interface TeamOption { id: string; name: string }

const PERIOD_TYPES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUAL', label: 'Annual' },
]
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'OVERDUE', 'CANCELLED']

const PRIORITY_TONE: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-rose-100 text-rose-700',
}
const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-sky-100 text-sky-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  OVERDUE: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}
const STATUS_ICON: Record<string, typeof Clock> = {
  DRAFT: Clock,
  ACTIVE: TrendingUp,
  COMPLETED: CheckCircle2,
  OVERDUE: AlertCircle,
  CANCELLED: AlertCircle,
}

const todayStr = () => new Date().toISOString().split('T')[0]
const addDays = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().split('T')[0] }

const emptyForm = {
  title: '', description: '', periodType: 'MONTHLY',
  startDate: todayStr(), endDate: addDays(30),
  subCityId: 'NONE', woredaId: 'NONE', teamId: 'NONE', responsibleStaffId: 'NONE',
  activity: '', targetAmount: '', targetQuantity: '', expectedOutcome: '',
  priority: 'MEDIUM', remarks: '',
}

export function PlansManagement() {
  const { toast } = useToast()
  const [plans, setPlans] = useState<Plan[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [subCities, setSubCities] = useState<SubCityOption[]>([])
  const [woredas, setWoredas] = useState<WoredaOption[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPeriod, setFilterPeriod] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [progressOpen, setProgressOpen] = useState<Plan | null>(null)
  const [progressForm, setProgressForm] = useState({ actualAmount: '', actualQuantity: '', progress: '', status: '', remarks: '', challenges: '' })
  const [progressSaving, setProgressSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterPeriod) params.set('periodType', filterPeriod)
    if (filterStatus) params.set('status', filterStatus)
    Promise.all([
      fetch(`/api/plans?${params}`).then(r => r.json()),
      fetch('/api/staff?active=true').then(r => r.json()),
      fetch('/api/sub-cities').then(r => r.json()),
      fetch('/api/woredas').then(r => r.json()),
      fetch('/api/teams').then(r => r.json()),
    ]).then(([p, s, sc, w, t]) => {
      setPlans(p); setStaff(s); setSubCities(sc); setWoredas(w); setTeams(t)
    }).finally(() => setLoading(false))
  }, [filterPeriod, filterStatus])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm(emptyForm); setEditing(null); setOpen(true) }
  const openEdit = (p: Plan) => {
    setEditing(p)
    setForm({
      title: p.title, description: p.description || '', periodType: p.periodType,
      startDate: p.startDate.split('T')[0], endDate: p.endDate.split('T')[0],
      subCityId: p.subCity?.name || 'NONE', woredaId: p.woreda?.name || 'NONE',
      teamId: p.team?.name || 'NONE', responsibleStaffId: p.responsible?.fullName || 'NONE',
      activity: p.activity, targetAmount: p.targetAmount ? String(p.targetAmount) : '',
      targetQuantity: p.targetQuantity ? String(p.targetQuantity) : '',
      expectedOutcome: p.expectedOutcome || '', priority: p.priority, remarks: p.remarks || '',
    })
    setOpen(true)
  }

  // Helper to resolve IDs from names (for edit mode)
  const resolveId = (name: string, list: {id:string;name:string}[], fallback?: string) => {
    if (!name || name === 'NONE') return 'NONE'
    const found = list.find(x => x.name === name)
    return found?.id || fallback || 'NONE'
  }

  const save = async () => {
    if (!form.title || !form.activity) {
      toast({ title: 'Missing fields', description: 'Title and Activity are required.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title, description: form.description || null, periodType: form.periodType,
        startDate: form.startDate, endDate: form.endDate,
        subCityId: form.subCityId !== 'NONE' ? form.subCityId : null,
        woredaId: form.woredaId !== 'NONE' ? form.woredaId : null,
        teamId: form.teamId !== 'NONE' ? form.teamId : null,
        responsibleStaffId: form.responsibleStaffId !== 'NONE' ? form.responsibleStaffId : null,
        activity: form.activity,
        targetAmount: form.targetAmount ? Number(form.targetAmount) : null,
        targetQuantity: form.targetQuantity ? Number(form.targetQuantity) : null,
        expectedOutcome: form.expectedOutcome || null,
        priority: form.priority, remarks: form.remarks || null,
      }
      const res = await fetch(editing ? `/api/plans/${editing.id}` : '/api/plans', {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast({ title: editing ? 'Plan updated' : 'Plan created', description: form.title })
      setOpen(false); load()
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const remove = async (p: Plan) => {
    if (!confirm(`Delete plan "${p.title}"?`)) return
    const res = await fetch(`/api/plans/${p.id}`, { method: 'DELETE' })
    if (res.ok) { toast({ title: 'Plan deleted' }); load() }
  }

  const openProgress = (p: Plan) => {
    setProgressOpen(p)
    setProgressForm({
      actualAmount: p.actualAmount ? String(p.actualAmount) : '',
      actualQuantity: p.actualQuantity ? String(p.actualQuantity) : '',
      progress: String(p.progress),
      status: p.status,
      remarks: p.remarks || '',
      challenges: p.challenges || '',
    })
  }

  const saveProgress = async () => {
    if (!progressOpen) return
    setProgressSaving(true)
    try {
      const res = await fetch(`/api/plans/${progressOpen.id}/progress`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actualAmount: progressForm.actualAmount ? Number(progressForm.actualAmount) : null,
          actualQuantity: progressForm.actualQuantity ? Number(progressForm.actualQuantity) : null,
          progress: progressForm.progress ? Number(progressForm.progress) : undefined,
          status: progressForm.status || undefined,
          remarks: progressForm.remarks || null,
          challenges: progressForm.challenges || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast({ title: 'Progress updated', description: `${progressOpen.title} — ${data.progress}%` })
      setProgressOpen(null); load()
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally { setProgressSaving(false) }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Plans & Achievement</h2>
          <p className="text-sm text-muted-foreground mt-1">Create daily, weekly, monthly, quarterly, and annual plans. Track target vs actual achievement.</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Plan</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterPeriod || 'ALL'} onValueChange={v => setFilterPeriod(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Period" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All periods</SelectItem>
            {PERIOD_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus || 'ALL'} onValueChange={v => setFilterStatus(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}</div>
      ) : plans.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <CalendarDays className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No plans yet. Click &quot;Add Plan&quot; to create the first one.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {plans.map(p => {
            const StatusIcon = STATUS_ICON[p.status] || Clock
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium truncate">{p.title}</p>
                        <Badge variant="outline" className="text-[10px]">{p.periodType}</Badge>
                        <Badge variant="secondary" className={`text-[10px] ${PRIORITY_TONE[p.priority]}`}>{p.priority}</Badge>
                        <Badge variant="secondary" className={`text-[10px] ${STATUS_TONE[p.status]}`}>
                          <StatusIcon className="h-3 w-3 mr-0.5" />{p.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.activity}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{fmtDateShort(p.startDate)} → {fmtDateShort(p.endDate)}</span>
                        {p.subCity && <span>Sub-City: {p.subCity.name}</span>}
                        {p.woreda && <span>Woreda: {p.woreda.name}</span>}
                        {p.team && <span>Team: {p.team.name}</span>}
                        {p.responsible && <span>Responsible: {p.responsible.fullName}</span>}
                      </div>
                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Progress: {p.progress}%</span>
                          {p.targetAmount && (
                            <span className="text-muted-foreground">
                              {fmtETB(p.actualAmount || 0)} / {fmtETB(p.targetAmount)}
                            </span>
                          )}
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-all ${p.progress >= 100 ? 'bg-emerald-500' : p.progress >= 50 ? 'bg-sky-500' : 'bg-amber-500'}`}
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => openProgress(p)} className="gap-1.5">
                        <TrendingUp className="h-3 w-3" /> Update
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />{editing ? 'Edit Plan' : 'Add New Plan'}</DialogTitle>
            <DialogDescription>{editing ? 'Update the plan details.' : 'Create a new collection plan for any administrative level and period.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Q1 Business Tax Collection" />
            </div>
            <div className="space-y-1.5">
              <Label>Period Type *</Label>
              <Select value={form.periodType} onValueChange={v => setForm({...form, periodType: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PERIOD_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start Date *</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date *</Label>
              <Input type="date" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Activity *</Label>
              <Textarea value={form.activity} onChange={e => setForm({...form, activity: e.target.value})} rows={2} placeholder="e.g. Visit 50 business taxpayers for Q1 collection" />
            </div>
            <div className="space-y-1.5">
              <Label>Target Amount (ETB)</Label>
              <Input type="number" min="0" step="0.01" value={form.targetAmount} onChange={e => setForm({...form, targetAmount: e.target.value})} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Target Quantity</Label>
              <Input type="number" min="0" value={form.targetQuantity} onChange={e => setForm({...form, targetQuantity: e.target.value})} placeholder="e.g. 50 taxpayers" />
            </div>
            <div className="space-y-1.5">
              <Label>Sub-City</Label>
              <Select value={form.subCityId} onValueChange={v => setForm({...form, subCityId: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— None —</SelectItem>
                  {subCities.map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Woreda</Label>
              <Select value={form.woredaId} onValueChange={v => setForm({...form, woredaId: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— None —</SelectItem>
                  {woredas.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Team</Label>
              <Select value={form.teamId} onValueChange={v => setForm({...form, teamId: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— None —</SelectItem>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Responsible Person</Label>
              <Select value={form.responsibleStaffId} onValueChange={v => setForm({...form, responsibleStaffId: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— None —</SelectItem>
                  {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Expected Outcome</Label>
              <Input value={form.expectedOutcome} onChange={e => setForm({...form, expectedOutcome: e.target.value})} placeholder="e.g. Collect ETB 500,000 from 50 businesses" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Remarks</Label>
              <Textarea value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} rows={2} placeholder="Additional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Plan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress update dialog */}
      <Dialog open={!!progressOpen} onOpenChange={o => !o && setProgressOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Update Achievement</DialogTitle>
            <DialogDescription>{progressOpen?.title}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Actual Amount Collected (ETB)</Label>
              <Input type="number" min="0" step="0.01" value={progressForm.actualAmount} onChange={e => setProgressForm({...progressForm, actualAmount: e.target.value})} placeholder="0.00" />
              {progressOpen?.targetAmount && (
                <p className="text-xs text-muted-foreground">Target: {fmtETB(progressOpen.targetAmount)} — progress auto-calculated if left blank</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Actual Quantity</Label>
              <Input type="number" min="0" value={progressForm.actualQuantity} onChange={e => setProgressForm({...progressForm, actualQuantity: e.target.value})} placeholder="e.g. 35 taxpayers visited" />
            </div>
            <div className="space-y-1.5">
              <Label>Progress %</Label>
              <Input type="number" min="0" max="100" value={progressForm.progress} onChange={e => setProgressForm({...progressForm, progress: e.target.value})} placeholder="Auto-calculated if amount is set" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={progressForm.status} onValueChange={v => setProgressForm({...progressForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Challenges</Label>
              <Textarea value={progressForm.challenges} onChange={e => setProgressForm({...progressForm, challenges: e.target.value})} rows={2} placeholder="Any challenges encountered" />
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Textarea value={progressForm.remarks} onChange={e => setProgressForm({...progressForm, remarks: e.target.value})} rows={2} placeholder="Additional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressOpen(null)} disabled={progressSaving}>Cancel</Button>
            <Button onClick={saveProgress} disabled={progressSaving}>{progressSaving ? 'Saving…' : 'Update Achievement'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
