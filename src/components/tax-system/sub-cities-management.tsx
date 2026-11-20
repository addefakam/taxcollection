'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
import { useToast } from '@/hooks/use-toast'
import {
  Building2,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Users,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react'

interface WoredaInSubCity {
  id: string
  name: string
  active: boolean
  _count?: { taxPayers: number }
}

interface SubCity {
  id: string
  name: string
  region?: string | null
  active: boolean
  createdAt: string
  _count?: { woredas: number }
  woredas?: WoredaInSubCity[]
}

const emptySubCityForm = { name: '', region: 'Oromia' }
const emptyWoredaForm = { name: '', region: 'Oromia', subCityId: '' }

export function SubCitiesManagement() {
  const { toast } = useToast()
  const [subCities, setSubCities] = useState<SubCity[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const [scOpen, setScOpen] = useState(false)
  const [scEditing, setScEditing] = useState<SubCity | null>(null)
  const [scForm, setScForm] = useState(emptySubCityForm)
  const [scSaving, setScSaving] = useState(false)

  const [wOpen, setWOpen] = useState(false)
  const [wEditing, setWEditing] = useState<WoredaInSubCity | null>(null)
  const [wForm, setWForm] = useState(emptyWoredaForm)
  const [wSaving, setWSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/sub-cities')
      .then((r) => r.json())
      .then((d) => {
        setSubCities(d)
        setExpandedIds(new Set(d.map((sc: SubCity) => sc.id)))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openScCreate = () => {
    setScForm(emptySubCityForm)
    setScEditing(null)
    setScOpen(true)
  }

  const openScEdit = (sc: SubCity) => {
    setScEditing(sc)
    setScForm({ name: sc.name, region: sc.region || 'Oromia' })
    setScOpen(true)
  }

  const saveSubCity = async () => {
    if (!scForm.name) {
      toast({ title: 'Missing field', description: 'Name is required.', variant: 'destructive' })
      return
    }
    setScSaving(true)
    try {
      const res = await fetch(
        scEditing ? `/api/sub-cities/${scEditing.id}` : '/api/sub-cities',
        { method: scEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scForm) }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast({ title: scEditing ? 'Sub-City updated' : 'Sub-City created', description: scForm.name })
      setScOpen(false)
      load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setScSaving(false)
    }
  }

  const deactivateSubCity = async (sc: SubCity) => {
    if (!confirm(`Deactivate sub-city ${sc.name}?`)) return
    const res = await fetch(`/api/sub-cities/${sc.id}`, { method: 'DELETE' })
    if (res.ok) { toast({ title: 'Sub-City deactivated', description: sc.name }); load() }
  }

  const openWCreate = (subCityId?: string) => {
    setWForm({ ...emptyWoredaForm, subCityId: subCityId || '' })
    setWEditing(null)
    setWOpen(true)
  }

  const openWEdit = (w: WoredaInSubCity, subCityId?: string) => {
    setWEditing(w)
    setWForm({ name: w.name, region: 'Oromia', subCityId: subCityId || '' })
    setWOpen(true)
  }

  const saveWoreda = async () => {
    if (!wForm.name) {
      toast({ title: 'Missing field', description: 'Name is required.', variant: 'destructive' })
      return
    }
    setWSaving(true)
    try {
      const res = await fetch(
        wEditing ? `/api/woredas/${wEditing.id}` : '/api/woredas',
        { method: wEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: wForm.name, region: wForm.region, subCityId: wForm.subCityId || null }) }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast({ title: wEditing ? 'Woreda updated' : 'Woreda created', description: wForm.name })
      setWOpen(false)
      load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setWSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Sub-Cities & Woredas
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the geographic hierarchy: City → Sub-City → Woreda. Each name is unique.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openWCreate()} className="gap-2">
            <MapPin className="h-4 w-4" /> Add Woreda
          </Button>
          <Button onClick={openScCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Add Sub-City
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : subCities.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No sub-cities yet. Click &quot;Add Sub-City&quot; to create the first one.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {subCities.map((sc) => {
            const expanded = expandedIds.has(sc.id)
            return (
              <Card key={sc.id}>
                <div className="p-4 cursor-pointer hover:bg-muted/30" onClick={() => toggleExpand(sc.id)}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                      <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{sc.name}</p>
                          {!sc.active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {sc.region} · {sc._count?.woredas || 0} woredas
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" onClick={() => openWCreate(sc.id)} className="gap-1.5">
                        <Plus className="h-3 w-3" /> Add Woreda
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openScEdit(sc)}><Pencil className="h-3.5 w-3.5" /></Button>
                      {sc.active && <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deactivateSubCity(sc)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </div>
                </div>
                {expanded && (
                  <div className="border-t">
                    {sc.woredas && sc.woredas.length > 0 ? (
                      <div className="divide-y">
                        {sc.woredas.map((w) => (
                          <div key={w.id} className="p-3 pl-12 hover:bg-muted/20 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate">{w.name}</span>
                              {!w.active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <Users className="h-3 w-3" /> {w._count?.taxPayers || 0}
                              </span>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => openWEdit(w, sc.id)}><Pencil className="h-3.5 w-3.5" /></Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 pl-12 text-xs text-muted-foreground">No woredas in this sub-city yet.</div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Sub-city dialog */}
      <Dialog open={scOpen} onOpenChange={setScOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />{scEditing ? 'Edit Sub-City' : 'Add New Sub-City'}</DialogTitle>
            <DialogDescription>{scEditing ? 'Update the sub-city details.' : 'Create a new sub-city. The name must be unique.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={scForm.name} onChange={(e) => setScForm({ ...scForm, name: e.target.value })} placeholder="e.g. Bishoftu Town Center" />
            </div>
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Input value={scForm.region} onChange={(e) => setScForm({ ...scForm, region: e.target.value })} placeholder="e.g. Oromia" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScOpen(false)} disabled={scSaving}>Cancel</Button>
            <Button onClick={saveSubCity} disabled={scSaving}>{scSaving ? 'Saving…' : scEditing ? 'Save Changes' : 'Create Sub-City'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Woreda dialog */}
      <Dialog open={wOpen} onOpenChange={setWOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />{wEditing ? 'Edit Woreda' : 'Add New Woreda'}</DialogTitle>
            <DialogDescription>{wEditing ? 'Update the woreda details.' : 'Create a new woreda under a sub-city. The name must be unique.'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Sub-City</Label>
              <Select value={wForm.subCityId || 'NONE'} onValueChange={(v) => setWForm({ ...wForm, subCityId: v === 'NONE' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Select a sub-city..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— No sub-city (standalone) —</SelectItem>
                  {subCities.filter((sc) => sc.active).map((sc) => (
                    <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={wForm.name} onChange={(e) => setWForm({ ...wForm, name: e.target.value })} placeholder="e.g. Woreda 01 - Town Center" />
            </div>
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Input value={wForm.region} onChange={(e) => setWForm({ ...wForm, region: e.target.value })} placeholder="e.g. Oromia" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWOpen(false)} disabled={wSaving}>Cancel</Button>
            <Button onClick={saveWoreda} disabled={wSaving}>{wSaving ? 'Saving…' : wEditing ? 'Save Changes' : 'Create Woreda'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
