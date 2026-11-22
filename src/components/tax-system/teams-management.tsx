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
import { Users, Plus, Pencil, Trash2, UserCog } from 'lucide-react'

interface Team {
  id: string; name: string; description?: string | null
  woredaId?: string | null; woreda?: { name: string } | null
  subCityId?: string | null; subCity?: { name: string } | null
  leadStaffId?: string | null; lead?: { id: string; fullName: string } | null
  active: boolean; _count?: { members: number }
}

interface StaffOption { id: string; fullName: string; role: string }
interface WoredaOption { id: string; name: string; subCity?: { name: string } | null }
interface SubCityOption { id: string; name: string }

const emptyForm = { name: '', description: '', woredaId: '', subCityId: '', leadStaffId: '' }

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
  const [form, setForm] = useState(emptyForm)
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

  // Filter woredas based on role scope
  const scopedWoredas = role === 'SUBCITY_ADMIN' && assignedSubCityId
    ? woredas.filter(w => {
        // Find the sub-city name for the assigned sub-city
        const scName = subCities.find(sc => sc.id === assignedSubCityId)?.name
        return w.subCity?.name === scName
      })
    : role === 'WOREDA_ADMIN' && assignedWoredaId
      ? woredas.filter(w => w.id === assignedWoredaId)
      : woredas

  // Filter sub-cities based on role scope
  const scopedSubCities = role === 'SUBCITY_ADMIN' && assignedSubCityId
    ? subCities.filter(sc => sc.id === assignedSubCityId)
    : subCities

  const openCreate = () => {
    setForm({
      ...emptyForm,
      // Pre-fill for SUBCITY_ADMIN
      subCityId: role === 'SUBCITY_ADMIN' && assignedSubCityId ? assignedSubCityId : '',
      // Pre-fill for WOREDA_ADMIN
      woredaId: role === 'WOREDA_ADMIN' && assignedWoredaId ? assignedWoredaId : '',
    })
    setEditing(null)
    setOpen(true)
  }

  const openEdit = (t: Team) => {
    setEditing(t)
    setForm({
      name: t.name,
      description: t.description || '',
      woredaId: t.woredaId || '',
      subCityId: t.subCityId || '',
      leadStaffId: t.leadStaffId || '',
    })
    setOpen(true)
  }

  const save = async () => {
    if (!form.name) {
      toast({ title: 'Missing', description: 'Name is required.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description || null,
        leadStaffId: form.leadStaffId || null,
      }

      // Sub-City: for SUBCITY_ADMIN, force to their assigned sub-city
      if (role === 'SUBCITY_ADMIN' && assignedSubCityId) {
        payload.subCityId = assignedSubCityId
      } else if (form.subCityId) {
        payload.subCityId = form.subCityId
      } else {
        payload.subCityId = null
      }

      // Woreda: for WOREDA_ADMIN, force to their assigned woreda
      if (role === 'WOREDA_ADMIN' && assignedWoredaId) {
        payload.woredaId = assignedWoredaId
      } else if (form.woredaId) {
        payload.woredaId = form.woredaId
      } else {
        payload.woredaId = null
      }

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

  const deactivate = async (t: Team) => {
    if (!confirm(`Deactivate team ${t.name}?`)) return
    const res = await fetch(`/api/teams/${t.id}`, { method: 'DELETE' })
    if (res.ok) { toast({ title: 'Team deactivated' }); load() }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Teams</h2>
          <p className="text-sm text-muted-foreground mt-1">Create and manage collection teams within sub-cities and woredas.</p>
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
          {teams.map(t => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-primary flex-shrink-0" />
                      <p className="font-medium truncate">{t.name}</p>
                      {!t.active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {t.subCity && !t.woreda && <span>Level: Sub-City</span>}
                      {t.woreda && <span>Level: Woreda</span>}
                      {!t.subCity && !t.woreda && <span>Level: City</span>}
                      {t.subCity && <span>Sub-City: {t.subCity.name}</span>}
                      {t.woreda && <span>Woreda: {t.woreda.name}</span>}
                      {t.lead && <span className="flex items-center gap-1"><UserCog className="h-3 w-3" /> Lead: {t.lead.fullName}</span>}
                      <span>{t._count?.members || 0} members</span>
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                    {t.active && <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deactivate(t)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" />{editing ? 'Edit Team' : 'Add New Team'}</DialogTitle>
            <DialogDescription>{editing ? 'Update the team details.' : 'Create a new collection team. Assign it to a sub-city or woreda and select a team lead.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Team Name *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Team A - Business Tax" />
            </div>
            {/* Sub-City — hidden for SUBCITY_ADMIN (auto-assigned), locked for WOREDA_ADMIN (not applicable) */}
            {role !== 'SUBCITY_ADMIN' && role !== 'WOREDA_ADMIN' && (
              <div className="space-y-1.5">
                <Label>Sub-City</Label>
                <Select value={form.subCityId || 'NONE'} onValueChange={v => setForm({...form, subCityId: v === 'NONE' ? '' : v})}>
                  <SelectTrigger><SelectValue placeholder="Select sub-city..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">— None —</SelectItem>
                    {scopedSubCities.map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Woreda — hidden for WOREDA_ADMIN (auto-assigned), filtered for SUBCITY_ADMIN */}
            {role !== 'WOREDA_ADMIN' && (
              <div className="space-y-1.5">
                <Label>Woreda</Label>
                <Select value={form.woredaId || 'NONE'} onValueChange={v => setForm({...form, woredaId: v === 'NONE' ? '' : v})}>
                  <SelectTrigger><SelectValue placeholder="Select woreda..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">— None —</SelectItem>
                    {scopedWoredas.map(w => <SelectItem key={w.id} value={w.id}>{w.name}{w.subCity ? ` (${w.subCity.name})` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
                {role === 'SUBCITY_ADMIN' && <p className="text-xs text-muted-foreground">Only woredas in your sub-city are shown.</p>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Team Lead</Label>
              <Select value={form.leadStaffId || 'NONE'} onValueChange={v => setForm({...form, leadStaffId: v === 'NONE' ? '' : v})}>
                <SelectTrigger><SelectValue placeholder="Select staff member..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— No lead assigned —</SelectItem>
                  {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.fullName} ({s.role})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} placeholder="Optional description of the team's responsibilities" />
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
