'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useRole } from './role-context'
import { Users, Plus, Pencil, Trash2, UserCog, Building2, MapPin } from 'lucide-react'

interface Team {
  id: string; name: string; description?: string | null
  woredaId?: string | null; woreda?: { name: string } | null
  subCityId?: string | null; subCity?: { name: string } | null
  leadStaffId?: string | null; lead?: { id: string; fullName: string } | null
  active: boolean; _count?: { members: number }
}

interface StaffOption { id: string; fullName: string; role: string }
interface WoredaOption { id: string; name: string; subCityId?: string | null }
interface SubCityOption { id: string; name: string }

type TeamLevel = 'CITY' | 'SUBCITY' | 'WOREDA'

interface TeamForm {
  name: string
  description: string
  level: TeamLevel
  subCityId: string
  woredaId: string
  leadStaffId: string
}

const emptyForm: TeamForm = {
  name: '',
  description: '',
  level: 'CITY',
  subCityId: '',
  woredaId: '',
  leadStaffId: '',
}

export function TeamsManagement() {
  const { toast } = useToast()
  const { role, assignedSubCityId, assignedWoredaId } = useRole()
  const [teams, setTeams] = useState<Team[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [woredas, setWoredas] = useState<WoredaOption[]>([])
  const [subCities, setSubCities] = useState<SubCityOption[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Team | null>(null)
  const [form, setForm] = useState<TeamForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/teams').then(r => r.json()),
      fetch('/api/staff?active=true').then(r => r.json()),
      fetch('/api/woredas').then(r => r.json()),
      fetch('/api/sub-cities').then(r => r.json()),
    ]).then(([t, s, w, sc]) => {
      setTeams(t); setStaff(s); setWoredas(w); setSubCities(sc)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Determine available levels based on role
  const cityWideRoles = ['SYSTEM_ADMIN', 'CITY_ADMIN', 'LEADER']
  const isCityWide = cityWideRoles.includes(role)
  const availableLevels: { value: TeamLevel; label: string }[] = isCityWide
    ? [
        { value: 'CITY', label: 'City Level' },
        { value: 'SUBCITY', label: 'Sub-City Level' },
        { value: 'WOREDA', label: 'Woreda Level' },
      ]
    : role === 'SUBCITY_ADMIN'
      ? [
          { value: 'SUBCITY', label: 'Sub-City Level' },
          { value: 'WOREDA', label: 'Woreda Level' },
        ]
      : role === 'WOREDA_ADMIN'
        ? [{ value: 'WOREDA', label: 'Woreda Level' }]
        : []

  // Filter woredas based on selected sub-city (for the woreda dropdown)
  const getFilteredWoredas = () => {
    if (form.level !== 'WOREDA') return []
    if (role === 'WOREDA_ADMIN' && assignedWoredaId) {
      return woredas.filter(w => w.id === assignedWoredaId)
    }
    if (form.subCityId) {
      return woredas.filter(w => w.subCityId === form.subCityId)
    }
    return woredas
  }

  const filteredWoredas = getFilteredWoredas()

  const openCreate = () => {
    const defaultLevel = availableLevels[0]?.value || 'CITY'
    setForm({
      ...emptyForm,
      level: defaultLevel,
      subCityId: role === 'SUBCITY_ADMIN' && assignedSubCityId ? assignedSubCityId : '',
      woredaId: role === 'WOREDA_ADMIN' && assignedWoredaId ? assignedWoredaId : '',
    })
    setEditing(null)
    setOpen(true)
  }

  const openEdit = (t: Team) => {
    setEditing(t)
    // Determine level from team data
    const level: TeamLevel = t.woredaId ? 'WOREDA' : t.subCityId ? 'SUBCITY' : 'CITY'
    setForm({
      name: t.name,
      description: t.description || '',
      level,
      subCityId: t.subCityId || '',
      woredaId: t.woredaId || '',
      leadStaffId: t.leadStaffId || '',
    })
    setOpen(true)
  }

  const onLevelChange = (newLevel: TeamLevel) => {
    setForm({
      ...form,
      level: newLevel,
      // Reset sub-city and woreda when level changes
      subCityId: newLevel === 'SUBCITY' && role === 'SUBCITY_ADMIN' && assignedSubCityId
        ? assignedSubCityId : '',
      woredaId: newLevel === 'WOREDA' && role === 'WOREDA_ADMIN' && assignedWoredaId
        ? assignedWoredaId : '',
    })
  }

  const save = async () => {
    if (!form.name) {
      toast({ title: 'Missing', description: 'Team name is required.', variant: 'destructive' })
      return
    }

    // Build payload based on level
    const payload: Record<string, unknown> = {
      name: form.name,
      description: form.description || null,
      leadStaffId: form.leadStaffId || null,
    }

    if (form.level === 'CITY') {
      payload.subCityId = null
      payload.woredaId = null
    } else if (form.level === 'SUBCITY') {
      // For SUBCITY_ADMIN, always use their assigned sub-city
      const scId = role === 'SUBCITY_ADMIN' && assignedSubCityId
        ? assignedSubCityId
        : form.subCityId
      if (!scId) {
        toast({ title: 'Missing', description: 'Please select a sub-city.', variant: 'destructive' })
        return
      }
      payload.subCityId = scId
      payload.woredaId = null // sub-city level team has no woreda
    } else if (form.level === 'WOREDA') {
      // For WOREDA_ADMIN, always use their assigned woreda
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
    }

    setSaving(true)
    try {
      const res = await fetch(
        editing ? `/api/teams/${editing.id}` : '/api/teams',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast({ title: editing ? 'Team updated' : 'Team created', description: form.name })
      setOpen(false); load()
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const remove = async (t: Team) => {
    if (!confirm(`Delete team "${t.name}"?`)) return
    const res = await fetch(`/api/teams/${t.id}`, { method: 'DELETE' })
    if (res.ok) { toast({ title: 'Team deleted' }); load() }
    else {
      const d = await res.json()
      toast({ title: 'Error', description: d.error, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Teams</h2>
          <p className="text-sm text-muted-foreground mt-1">Create teams at sub-city or woreda level. Assign team leads and manage members.</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Team</Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : teams.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No teams yet. Click &quot;Add Team&quot; to create the first one.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {teams.map(t => {
            const level = t.woredaId ? 'Woreda Level' : t.subCityId ? 'Sub-City Level' : 'City Level'
            return (
              <Card key={t.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-primary flex-shrink-0" />
                        <p className="font-medium truncate">{t.name}</p>
                        <Badge variant="outline" className="text-[10px]">{level}</Badge>
                        {!t.active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {t.subCity && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {t.subCity.name}</span>}
                        {t.woreda && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {t.woreda.name}</span>}
                        {t.lead && <span className="flex items-center gap-1"><UserCog className="h-3 w-3" /> Lead: {t.lead.fullName}</span>}
                        <span>{t._count?.members || 0} members</span>
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add/Edit Team Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />{editing ? 'Edit Team' : 'Add New Team'}</DialogTitle>
            <DialogDescription>{editing ? 'Update the team details.' : 'Create a new collection team at sub-city or woreda level.'}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Team Name */}
            <div className="space-y-1.5">
              <Label>Team Name *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Team A - Business Tax" />
            </div>

            {/* Team Level — only show if more than one option */}
            {availableLevels.length > 1 && !editing && (
              <div className="space-y-1.5">
                <Label>Team Level</Label>
                <Select value={form.level} onValueChange={v => onLevelChange(v as TeamLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableLevels.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sub-City selector — only for SUBCITY and WOREDA levels */}
            {form.level !== 'CITY' && (
              <div className="space-y-1.5">
                <Label>Sub-City {form.level === 'SUBCITY' ? '*' : '(auto from woreda)'}</Label>
                {role === 'SUBCITY_ADMIN' && assignedSubCityId ? (
                  // Locked for SUBCITY_ADMIN — show their sub-city, not editable
                  <Input
                    value={subCities.find(sc => sc.id === assignedSubCityId)?.name || 'Your Sub-City'}
                    disabled
                    className="bg-muted"
                  />
                ) : form.level === 'WOREDA' ? (
                  // For WOREDA level, sub-city is auto-derived — don't show selector
                  <Input
                    value={form.woredaId ? (woredas.find(w => w.id === form.woredaId)?.subCityId
                      ? subCities.find(sc => sc.id === woredas.find(w => w.id === form.woredaId)?.subCityId)?.name || 'Auto'
                      : 'Auto') : 'Select woreda first'}
                    disabled
                    className="bg-muted"
                  />
                ) : (
                  // City-wide roles can pick any sub-city
                  <Select
                    value={form.subCityId || 'NONE'}
                    onValueChange={v => setForm({...form, subCityId: v === 'NONE' ? '' : v})}
                  >
                    <SelectTrigger><SelectValue placeholder="Select sub-city..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">— Select —</SelectItem>
                      {subCities.map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {role === 'SUBCITY_ADMIN' && <p className="text-xs text-muted-foreground">Locked to your assigned sub-city.</p>}
              </div>
            )}

            {/* Woreda selector — only for WOREDA level */}
            {form.level === 'WOREDA' && (
              <div className="space-y-1.5">
                <Label>Woreda *</Label>
                {role === 'WOREDA_ADMIN' && assignedWoredaId ? (
                  // Locked for WOREDA_ADMIN
                  <Input
                    value={woredas.find(w => w.id === assignedWoredaId)?.name || 'Your Woreda'}
                    disabled
                    className="bg-muted"
                  />
                ) : (
                  <Select
                    value={form.woredaId || 'NONE'}
                    onValueChange={v => setForm({...form, woredaId: v === 'NONE' ? '' : v})}
                  >
                    <SelectTrigger><SelectValue placeholder="Select woreda..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">— Select —</SelectItem>
                      {filteredWoredas.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {role === 'SUBCITY_ADMIN' && <p className="text-xs text-muted-foreground">Only woredas in your sub-city are shown.</p>}
                {role === 'WOREDA_ADMIN' && <p className="text-xs text-muted-foreground">Locked to your assigned woreda.</p>}
              </div>
            )}

            {/* Team Lead */}
            <div className="space-y-1.5">
              <Label>Team Lead</Label>
              <Select
                value={form.leadStaffId || 'NONE'}
                onValueChange={v => setForm({...form, leadStaffId: v === 'NONE' ? '' : v})}
              >
                <SelectTrigger><SelectValue placeholder="Select staff member..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— No lead assigned —</SelectItem>
                  {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName} ({s.role})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} placeholder="Optional description" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Team'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
