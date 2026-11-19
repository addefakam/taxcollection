'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Users,
} from 'lucide-react'

interface Woreda {
  id: string
  code: string
  name: string
  region?: string | null
  active: boolean
  createdAt: string
  _count?: { taxPayers: number; assignedStaff: number }
}

const emptyForm = {
  code: '',
  name: '',
  region: 'Oromia',
}

export function WoredasManagement() {
  const { toast } = useToast()
  const [list, setList] = useState<Woreda[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Woreda | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/woredas')
      .then((r) => r.json())
      .then((d) => setList(d))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm(emptyForm)
    setEditing(null)
    setCreateOpen(true)
  }

  const openEdit = (w: Woreda) => {
    setEditing(w)
    setForm({
      code: w.code,
      name: w.name,
      region: w.region || 'Oromia',
    })
    setCreateOpen(true)
  }

  const save = async () => {
    if (!form.code || !form.name) {
      toast({
        title: 'Missing fields',
        description: 'Code and Name are required.',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(
        editing ? `/api/woredas/${editing.id}` : '/api/woredas',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      toast({
        title: editing ? 'Woreda updated' : 'Woreda created',
        description: `${form.name} (Code ${form.code})`,
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

  const deactivate = async (w: Woreda) => {
    if (!confirm(`Deactivate woreda ${w.name} (Code ${w.code})?`)) return
    const res = await fetch(`/api/woredas/${w.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Woreda deactivated', description: w.name })
      load()
    } else {
      const d = await res.json()
      toast({ title: 'Error', description: d.error, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Sub-Cities (Woredas)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the sub-cities of Bishoftu. Each taxpayer and data collector is assigned to a woreda.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Woreda
        </Button>
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            All Woredas
            <Badge variant="secondary" className="ml-1">
              {loading ? '…' : list.length}
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
          ) : list.length === 0 ? (
            <div className="p-8 text-center">
              <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No woredas yet. Click "Add Woreda" to create the first one.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {list.map((w) => (
                <div key={w.id} className="p-4 hover:bg-muted/40">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          Code {w.code}
                        </Badge>
                        <p className="font-medium">{w.name}</p>
                        {!w.active && (
                          <Badge variant="secondary" className="text-[10px]">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {w.region && <span>Region: {w.region}</span>}
                        {w._count && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {w._count.taxPayers || 0} taxpayers
                            {w._count.assignedStaff > 0 && (
                              <> · {w._count.assignedStaff} staff assigned</>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(w)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {w.active && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deactivate(w)}
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
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {editing ? 'Edit Woreda' : 'Add New Woreda'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update the sub-city details below.'
                : 'Create a new sub-city (woreda) for Bishoftu.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. 06"
                disabled={!!editing}
              />
              <p className="text-xs text-muted-foreground">
                Short code for the woreda (unique). Cannot be changed after creation.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Woreda 06 - New Area"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Input
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                placeholder="e.g. Oromia"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Woreda'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
