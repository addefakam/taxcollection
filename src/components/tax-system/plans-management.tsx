'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useRole } from './role-context'
import { fmtETB, fmtDateShort } from './lib'
import { CalendarDays, Plus, Pencil, Trash2, TrendingUp, CheckCircle2, Clock, AlertCircle, Building2, MapPin, Users } from 'lucide-react'

interface Plan {
  id: string
  title: string
  description?: string | null
  periodType: string
  startDate: string
  endDate: string
  subCityId?: string | null
  woredaId?: string | null
  teamId?: string | null
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

interface StaffOption { id: string; fullName: string; role?: string }
interface SubCityOption { id: string; name: string }
interface WoredaOption { id: string; name: string; subCityId?: string | null }
interface TeamOption {
  id: string; name: string
  subCityId?: string | null
  woredaId?: string | null
}

type PlanLevel = 'CITY' | 'SUBCITY' | 'WOREDA' | 'TEAM'

interface PlanForm {
  title: string
  description: string
  periodType: string
  startDate: string
  endDate: string
  level: PlanLevel
  subCityId: string
  woredaId: string
  teamId: string
  responsibleStaffId: string
  activity: string
  targetAmount: string
  targetQuantity: string
  expectedOutcome: string
  priority: string
  remarks: string
}

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
const LEVEL_LABEL: Record<PlanLevel, string> = {
  CITY: 'City Level',
  SUBCITY: 'Sub-City Level',
  WOREDA: 'Woreda Level',
  TEAM: 'Team Level',
}

const todayStr = () => new Date().toISOString().split('T')[0]
const addDays = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().split('T')[0] }

// Default date ranges per period type
const defaultRange = (period: string): { start: string; end: string } => {
  const start = todayStr()
  switch (period) {
    case 'DAILY': return { start, end: start }
    case 'WEEKLY': return { start, end: addDays(7) }
    case 'MONTHLY': return { start, end: addDays(30) }
    case 'QUARTERLY': return { start, end: addDays(90) }
    case 'ANNUAL': return { start, end: addDays(365) }
    default: return { start, end: addDays(30) }
  }
}

const emptyForm: PlanForm = {
  title: '', description: '', periodType: 'MONTHLY',
  startDate: todayStr(), endDate: addDays(30),
  level: 'CITY',
  subCityId: '', woredaId: '', teamId: '', responsibleStaffId: '',
  activity: '', targetAmount: '', targetQuantity: '', expectedOutcome: '',
  priority: 'MEDIUM', remarks: '',
}

export function PlansManagement() {
  const { toast } = useToast()
  const { role, assignedSubCityId, assignedWoredaId, teamId } = useRole()
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
  const [form, setForm] = useState<PlanForm>(emptyForm)
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

  // ---- Role-based level availability (DOWNWARD ONLY) ----
  // City-wide roles: all 4 levels.
  // SUBCITY_ADMIN: Sub-City level + Woreda level (within their sub-city) — NOT City, NOT Team.
  // WOREDA_ADMIN: their woreda + levels below (Team) — NOT City or Sub-City.
  // TEAM_LEAD: Team level only (their team).
  // Other roles: no create access.
  const cityWideRoles = ['SYSTEM_ADMIN', 'CITY_ADMIN', 'LEADER']
  const canCreate = cityWideRoles.includes(role)
    || role === 'SUBCITY_ADMIN'
    || role === 'WOREDA_ADMIN'
    || role === 'TEAM_LEAD'

  const availableLevels: { value: PlanLevel; label: string }[] = (() => {
    if (cityWideRoles.includes(role)) {
      return [
        { value: 'CITY', label: 'City Level' },
        { value: 'SUBCITY', label: 'Sub-City Level' },
        { value: 'WOREDA', label: 'Woreda Level' },
        { value: 'TEAM', label: 'Team Level' },
      ]
    }
    if (role === 'SUBCITY_ADMIN') {
      // Sub-City Admin can only set plans at Sub-City and Woreda levels (within their sub-city)
      return [
        { value: 'SUBCITY', label: 'Sub-City Level' },
        { value: 'WOREDA', label: 'Woreda Level' },
      ]
    }
    if (role === 'WOREDA_ADMIN') {
      return [
        { value: 'WOREDA', label: 'Woreda Level' },
        { value: 'TEAM', label: 'Team Level' },
      ]
    }
    if (role === 'TEAM_LEAD') {
      return [{ value: 'TEAM', label: 'Team Level' }]
    }
    return []
  })()

  // ---- Scoped selectors (downward only) ----
  // Visible sub-cities
  const visibleSubCities: SubCityOption[] = (() => {
    if (cityWideRoles.includes(role)) return subCities
    if (role === 'SUBCITY_ADMIN' && assignedSubCityId) {
      return subCities.filter(sc => sc.id === assignedSubCityId)
    }
    if (role === 'WOREDA_ADMIN' && assignedWoredaId) {
      const w = woredas.find(x => x.id === assignedWoredaId)
      return w?.subCityId ? subCities.filter(sc => sc.id === w.subCityId) : []
    }
    if (role === 'TEAM_LEAD' && teamId) {
      const t = teams.find(x => x.id === teamId)
      if (t?.subCityId) return subCities.filter(sc => sc.id === t.subCityId)
      if (t?.woredaId) {
        const w = woredas.find(x => x.id === t.woredaId)
        return w?.subCityId ? subCities.filter(sc => sc.id === w.subCityId) : []
      }
    }
    return []
  })()

  // Visible woredas (filtered by selected sub-city or by role scope)
  const visibleWoredas: WoredaOption[] = (() => {
    if (role === 'WOREDA_ADMIN' && assignedWoredaId) {
      return woredas.filter(w => w.id === assignedWoredaId)
    }
    if (role === 'SUBCITY_ADMIN' && assignedSubCityId) {
      return woredas.filter(w => w.subCityId === assignedSubCityId)
    }
    // City-wide or TEAM_LEAD: filter by selected sub-city (if any), else all
    if (form.subCityId) return woredas.filter(w => w.subCityId === form.subCityId)
    return woredas
  })()

  // Visible teams (downward only)
  const visibleTeams: TeamOption[] = (() => {
    if (role === 'TEAM_LEAD' && teamId) {
      return teams.filter(t => t.id === teamId)
    }
    if (role === 'WOREDA_ADMIN' && assignedWoredaId) {
      return teams.filter(t => t.woredaId === assignedWoredaId)
    }
    if (role === 'SUBCITY_ADMIN' && assignedSubCityId) {
      // Teams directly attached to sub-city OR attached to a woreda in this sub-city
      return teams.filter(t =>
        t.subCityId === assignedSubCityId
        || (t.woredaId ? woredas.find(w => w.id === t.woredaId)?.subCityId === assignedSubCityId : false)
      )
    }
    // City-wide: filter by selected woreda/sub-city
    if (form.woredaId) return teams.filter(t => t.woredaId === form.woredaId)
    if (form.subCityId) {
      return teams.filter(t =>
        t.subCityId === form.subCityId
        || (t.woredaId ? woredas.find(w => w.id === t.woredaId)?.subCityId === form.subCityId : false)
      )
    }
    return teams
  })()

  // ---- Form helpers ----
  const openCreate = () => {
    const defaultLevel = availableLevels[0]?.value || 'CITY'
    setForm({
      ...emptyForm,
      level: defaultLevel,
      // For scoped roles, pre-fill the locked scope IDs
      subCityId: role === 'SUBCITY_ADMIN' && assignedSubCityId ? assignedSubCityId : '',
      woredaId: role === 'WOREDA_ADMIN' && assignedWoredaId ? assignedWoredaId : '',
      teamId: role === 'TEAM_LEAD' && teamId ? teamId : '',
      ...defaultRange('MONTHLY'),
    })
    setEditing(null)
    setOpen(true)
  }

  const openEdit = (p: Plan) => {
    setEditing(p)
    // Determine level from existing plan
    const level: PlanLevel = p.teamId ? 'TEAM' : p.woredaId ? 'WOREDA' : p.subCityId ? 'SUBCITY' : 'CITY'
    setForm({
      title: p.title,
      description: p.description || '',
      periodType: p.periodType,
      startDate: p.startDate.split('T')[0],
      endDate: p.endDate.split('T')[0],
      level,
      subCityId: p.subCityId || (role === 'SUBCITY_ADMIN' && assignedSubCityId ? assignedSubCityId : ''),
      woredaId: p.woredaId || (role === 'WOREDA_ADMIN' && assignedWoredaId ? assignedWoredaId : ''),
      teamId: p.teamId || (role === 'TEAM_LEAD' && teamId ? teamId : ''),
      responsibleStaffId: p.responsible?.fullName || '', // Note: this will be empty since API returns name only — resolved via staff list
      activity: p.activity,
      targetAmount: p.targetAmount ? String(p.targetAmount) : '',
      targetQuantity: p.targetQuantity ? String(p.targetQuantity) : '',
      expectedOutcome: p.expectedOutcome || '',
      priority: p.priority,
      remarks: p.remarks || '',
    })
    setOpen(true)
  }

  const onLevelChange = (newLevel: PlanLevel) => {
    // Reset dependent fields when level changes
    setForm({
      ...form,
      level: newLevel,
      // Keep locked role-scope IDs, otherwise reset
      subCityId: newLevel === 'SUBCITY' && role === 'SUBCITY_ADMIN' && assignedSubCityId
        ? assignedSubCityId : newLevel === 'CITY' ? '' : form.subCityId,
      woredaId: newLevel === 'WOREDA' && role === 'WOREDA_ADMIN' && assignedWoredaId
        ? assignedWoredaId : '',
      teamId: newLevel === 'TEAM' && role === 'TEAM_LEAD' && teamId
        ? teamId : '',
    })
  }

  const onPeriodChange = (newPeriod: string) => {
    const r = defaultRange(newPeriod)
    setForm({ ...form, periodType: newPeriod, startDate: r.start, endDate: r.end })
  }

  const save = async () => {
    if (!form.title || !form.activity) {
      toast({ title: 'Missing fields', description: 'Title and Activity are required.', variant: 'destructive' })
      return
    }
    if (!form.periodType || !form.startDate || !form.endDate) {
      toast({ title: 'Missing fields', description: 'Period type and dates are required.', variant: 'destructive' })
      return
    }

    // Build payload based on level (downward-only enforcement on the client)
    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description || null,
      periodType: form.periodType,
      startDate: form.startDate,
      endDate: form.endDate,
      responsibleStaffId: form.responsibleStaffId || null,
      activity: form.activity,
      targetAmount: form.targetAmount ? Number(form.targetAmount) : null,
      targetQuantity: form.targetQuantity ? Number(form.targetQuantity) : null,
      expectedOutcome: form.expectedOutcome || null,
      priority: form.priority,
      remarks: form.remarks || null,
    }

    if (form.level === 'CITY') {
      payload.subCityId = null
      payload.woredaId = null
      payload.teamId = null
    } else if (form.level === 'SUBCITY') {
      const scId = role === 'SUBCITY_ADMIN' && assignedSubCityId
        ? assignedSubCityId
        : form.subCityId
      if (!scId) {
        toast({ title: 'Missing', description: 'Please select a sub-city.', variant: 'destructive' })
        return
      }
      payload.subCityId = scId
      payload.woredaId = null
      payload.teamId = null
    } else if (form.level === 'WOREDA') {
      const wId = role === 'WOREDA_ADMIN' && assignedWoredaId
        ? assignedWoredaId
        : form.woredaId
      if (!wId) {
        toast({ title: 'Missing', description: 'Please select a woreda.', variant: 'destructive' })
        return
      }
      payload.woredaId = wId
      // Auto-derive subCityId from the woreda
      const woreda = woredas.find(w => w.id === wId)
      payload.subCityId = woreda?.subCityId || null
      payload.teamId = null
    } else if (form.level === 'TEAM') {
      const tId = role === 'TEAM_LEAD' && teamId
        ? teamId
        : form.teamId
      if (!tId) {
        toast({ title: 'Missing', description: 'Please select a team.', variant: 'destructive' })
        return
      }
      payload.teamId = tId
      // Auto-derive subCityId / woredaId from the team
      const team = teams.find(t => t.id === tId)
      payload.subCityId = team?.subCityId || null
      payload.woredaId = team?.woredaId || null
    }

    setSaving(true)
    try {
      const res = await fetch(editing ? `/api/plans/${editing.id}` : '/api/plans', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    else {
      const d = await res.json().catch(() => ({}))
      toast({ title: 'Error', description: d.error || 'Failed', variant: 'destructive' })
    }
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
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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

  // For edit mode: resolve responsibleStaffId by name (since list view only returns name)
  const responsibleStaffIdForForm = (() => {
    if (!editing) return form.responsibleStaffId
    const name = editing.responsible?.fullName
    if (!name) return ''
    const found = staff.find(s => s.fullName === name)
    return found?.id || ''
  })()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Plans &amp; Achievement</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create daily, weekly, monthly, quarterly, and annual plans at any administrative level within your access — downward only, not upward.
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Plan</Button>
        )}
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
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}</div>
      ) : plans.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <CalendarDays className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No plans yet. Click &quot;Add Plan&quot; to create the first one.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {plans.map(p => {
            const StatusIcon = STATUS_ICON[p.status] || Clock
            const level: PlanLevel = p.teamId ? 'TEAM' : p.woredaId ? 'WOREDA' : p.subCityId ? 'SUBCITY' : 'CITY'
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium truncate">{p.title}</p>
                        <Badge variant="outline" className="text-[10px]">{p.periodType}</Badge>
                        <Badge variant="outline" className="text-[10px] text-primary">{LEVEL_LABEL[level]}</Badge>
                        <Badge variant="secondary" className={`text-[10px] ${PRIORITY_TONE[p.priority]}`}>{p.priority}</Badge>
                        <Badge variant="secondary" className={`text-[10px] ${STATUS_TONE[p.status]}`}>
                          <StatusIcon className="h-3 w-3 mr-0.5" />{p.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.activity}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{fmtDateShort(p.startDate)} → {fmtDateShort(p.endDate)}</span>
                        {p.subCity && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {p.subCity.name}</span>}
                        {p.woreda && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.woreda.name}</span>}
                        {p.team && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {p.team.name}</span>}
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
                      {canCreate && <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>}
                      {canCreate && <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></Button>}
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
            <DialogDescription>
              Create a collection plan at any administrative level and period — limited to your access level (downward only, not upward).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Step 1: Title */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>1. Plan Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Q1 Business Tax Collection" />
            </div>

            {/* Step 2: Administrative Level */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>2. Administrative Level *</Label>
              <Select
                value={form.level}
                onValueChange={v => onLevelChange(v as PlanLevel)}
                disabled={availableLevels.length <= 1}
              >
                <SelectTrigger><SelectValue placeholder="Select level..." /></SelectTrigger>
                <SelectContent>
                  {availableLevels.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {role === 'SUBCITY_ADMIN' && 'You can create plans at Sub-City or Woreda level — within your sub-city only.'}
                {role === 'WOREDA_ADMIN' && 'You can create plans at Woreda or Team level — within your woreda only.'}
                {role === 'TEAM_LEAD' && 'You can create plans only for your team.'}
                {cityWideRoles.includes(role) && 'You can create plans at City, Sub-City, Woreda, or Team level — anywhere in the system.'}
              </p>
            </div>

            {/* Sub-City selector — visible for SUBCITY, WOREDA, TEAM levels */}
            {form.level !== 'CITY' && (
              <div className="space-y-1.5">
                <Label>
                  Sub-City {form.level === 'SUBCITY' ? '*' : '(auto-derived)'}
                </Label>
                {role === 'SUBCITY_ADMIN' && assignedSubCityId ? (
                  <Input
                    value={subCities.find(sc => sc.id === assignedSubCityId)?.name || 'Your Sub-City'}
                    disabled
                    className="bg-muted"
                  />
                ) : form.level === 'WOREDA' || form.level === 'TEAM' ? (
                  <Input
                    value={(() => {
                      if (form.level === 'WOREDA' && form.woredaId) {
                        const w = woredas.find(x => x.id === form.woredaId)
                        return w?.subCityId ? subCities.find(sc => sc.id === w.subCityId)?.name || '—' : '—'
                      }
                      if (form.level === 'TEAM' && form.teamId) {
                        const t = teams.find(x => x.id === form.teamId)
                        if (t?.subCityId) return subCities.find(sc => sc.id === t.subCityId)?.name || '—'
                        if (t?.woredaId) {
                          const w = woredas.find(x => x.id === t.woredaId)
                          return w?.subCityId ? subCities.find(sc => sc.id === w.subCityId)?.name || '—' : '—'
                        }
                      }
                      return '—'
                    })()}
                    disabled
                    className="bg-muted"
                  />
                ) : (
                  <Select
                    value={form.subCityId || 'NONE'}
                    onValueChange={v => setForm({ ...form, subCityId: v === 'NONE' ? '' : v, woredaId: '', teamId: '' })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select sub-city..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">— Select —</SelectItem>
                      {visibleSubCities.map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {role === 'SUBCITY_ADMIN' && <p className="text-xs text-muted-foreground">Locked to your assigned sub-city.</p>}
              </div>
            )}

            {/* Woreda selector — visible for WOREDA, TEAM levels */}
            {(form.level === 'WOREDA' || form.level === 'TEAM') && (
              <div className="space-y-1.5">
                <Label>
                  Woreda {form.level === 'WOREDA' ? '*' : '(auto-derived from team)'}
                </Label>
                {role === 'WOREDA_ADMIN' && assignedWoredaId ? (
                  <Input
                    value={woredas.find(w => w.id === assignedWoredaId)?.name || 'Your Woreda'}
                    disabled
                    className="bg-muted"
                  />
                ) : form.level === 'TEAM' ? (
                  <Input
                    value={form.teamId ? (teams.find(t => t.id === form.teamId)?.woredaId
                      ? woredas.find(w => w.id === teams.find(t => t.id === form.teamId)?.woredaId)?.name || '—'
                      : '—') : 'Select team first'}
                    disabled
                    className="bg-muted"
                  />
                ) : (
                  <Select
                    value={form.woredaId || 'NONE'}
                    onValueChange={v => setForm({ ...form, woredaId: v === 'NONE' ? '' : v, teamId: '' })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select woreda..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">— Select —</SelectItem>
                      {visibleWoredas.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {role === 'SUBCITY_ADMIN' && <p className="text-xs text-muted-foreground">Only woredas in your sub-city are shown.</p>}
                {role === 'WOREDA_ADMIN' && <p className="text-xs text-muted-foreground">Locked to your assigned woreda.</p>}
              </div>
            )}

            {/* Team selector — visible for TEAM level only */}
            {form.level === 'TEAM' && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Team *</Label>
                {role === 'TEAM_LEAD' && teamId ? (
                  <Input
                    value={teams.find(t => t.id === teamId)?.name || 'Your Team'}
                    disabled
                    className="bg-muted"
                  />
                ) : (
                  <Select
                    value={form.teamId || 'NONE'}
                    onValueChange={v => setForm({ ...form, teamId: v === 'NONE' ? '' : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select team..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">— Select —</SelectItem>
                      {visibleTeams.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                          {t.woredaId && woredas.find(w => w.id === t.woredaId)
                            ? ` — ${woredas.find(w => w.id === t.woredaId)?.name}`
                            : t.subCityId && subCities.find(sc => sc.id === t.subCityId)
                              ? ` — ${subCities.find(sc => sc.id === t.subCityId)?.name}`
                              : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {role === 'SUBCITY_ADMIN' && <p className="text-xs text-muted-foreground">Only teams in your sub-city are shown.</p>}
                {role === 'WOREDA_ADMIN' && <p className="text-xs text-muted-foreground">Only teams in your woreda are shown.</p>}
                {role === 'TEAM_LEAD' && <p className="text-xs text-muted-foreground">Locked to your team.</p>}
              </div>
            )}

            {/* Step 3: Period */}
            <div className="space-y-1.5">
              <Label>3. Period Type *</Label>
              <Select value={form.periodType} onValueChange={v => onPeriodChange(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PERIOD_TYPES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start Date *</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date *</Label>
              <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            </div>

            {/* Step 4: Activity */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>4. Activity *</Label>
              <Textarea value={form.activity} onChange={e => setForm({ ...form, activity: e.target.value })} rows={2} placeholder="e.g. Visit 50 business taxpayers for Q1 collection" />
            </div>
            <div className="space-y-1.5">
              <Label>Target Amount (ETB)</Label>
              <Input type="number" min="0" step="0.01" value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Target Quantity</Label>
              <Input type="number" min="0" value={form.targetQuantity} onChange={e => setForm({ ...form, targetQuantity: e.target.value })} placeholder="e.g. 50 taxpayers" />
            </div>

            {/* Step 5: Responsible Person */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>5. Responsible Person</Label>
              <Select
                value={responsibleStaffIdForForm || 'NONE'}
                onValueChange={v => setForm({ ...form, responsibleStaffId: v === 'NONE' ? '' : v })}
              >
                <SelectTrigger><SelectValue placeholder="Select staff member..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— No one assigned —</SelectItem>
                  {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName}{s.role ? ` (${s.role})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Expected Outcome</Label>
              <Input value={form.expectedOutcome} onChange={e => setForm({ ...form, expectedOutcome: e.target.value })} placeholder="e.g. Collect ETB 500,000 from 50 businesses" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Remarks</Label>
              <Textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={2} placeholder="Additional notes" />
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
              <Input type="number" min="0" step="0.01" value={progressForm.actualAmount} onChange={e => setProgressForm({ ...progressForm, actualAmount: e.target.value })} placeholder="0.00" />
              {progressOpen?.targetAmount && (
                <p className="text-xs text-muted-foreground">Target: {fmtETB(progressOpen.targetAmount)} — progress auto-calculated if left blank</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Actual Quantity</Label>
              <Input type="number" min="0" value={progressForm.actualQuantity} onChange={e => setProgressForm({ ...progressForm, actualQuantity: e.target.value })} placeholder="e.g. 35 taxpayers visited" />
            </div>
            <div className="space-y-1.5">
              <Label>Progress %</Label>
              <Input type="number" min="0" max="100" value={progressForm.progress} onChange={e => setProgressForm({ ...progressForm, progress: e.target.value })} placeholder="Auto-calculated if amount is set" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={progressForm.status} onValueChange={v => setProgressForm({ ...progressForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Challenges</Label>
              <Textarea value={progressForm.challenges} onChange={e => setProgressForm({ ...progressForm, challenges: e.target.value })} rows={2} placeholder="Any challenges encountered" />
            </div>
            <div className="space-y-1.5">
              <Label>Remarks</Label>
              <Textarea value={progressForm.remarks} onChange={e => setProgressForm({ ...progressForm, remarks: e.target.value })} rows={2} placeholder="Additional notes" />
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
