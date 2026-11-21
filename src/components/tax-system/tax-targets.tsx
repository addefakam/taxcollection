'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { TAX_CATEGORIES, FISCAL_YEARS, fmtETB, categoryLabel } from './lib'
import { Target, Plus, Pencil, Trash2, Building2, AlertCircle, CheckCircle2, Layers } from 'lucide-react'

interface TaxTarget {
  id: string
  fiscalYear: string
  level: string
  subCityId?: string | null
  subCity?: { name: string } | null
  woredaId?: string | null
  woreda?: { name: string } | null
  teamId?: string | null
  team?: { name: string } | null
  category: string
  expectedAmount: number
  notes?: string | null
  setBy?: { fullName: string } | null
  updatedAt: string
}

interface ReconciliationItem {
  parentLevel: string
  parentCategory: string
  parentAmount: number
  parentUnit: string
  childrenSum: number
  difference: number
  isBalanced: boolean
}

interface SubCityOption { id: string; name: string }
interface WoredaOption { id: string; name: string; subCity?: { name: string } | null }
interface TeamOption { id: string; name: string }

const LEVELS = [
  { value: 'CITY', label: 'City-wide' },
  { value: 'SUBCITY', label: 'Sub-City' },
  { value: 'WOREDA', label: 'Woreda' },
  { value: 'TEAM', label: 'Team' },
]

const LEVEL_TONE: Record<string, string> = {
  CITY: 'bg-indigo-100 text-indigo-700',
  SUBCITY: 'bg-teal-100 text-teal-700',
  WOREDA: 'bg-orange-100 text-orange-700',
  TEAM: 'bg-cyan-100 text-cyan-700',
}

const emptyForm = {
  fiscalYear: FISCAL_YEARS[1],
  level: 'CITY',
  category: 'BUSINESS',
  expectedAmount: '',
  notes: '',
  subCityId: 'NONE',
  woredaId: 'NONE',
  teamId: 'NONE',
}

export function TaxTargets() {
  const { toast } = useToast()
  const [targets, setTargets] = useState<TaxTarget[]>([])
  const [reconciliation, setReconciliation] = useState<ReconciliationItem[]>([])
  const [subCities, setSubCities] = useState<SubCityOption[]>([])
  const [woredas, setWoredas] = useState<WoredaOption[]>([])
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [loading, setLoading] = useState(true)
  const [fiscalYear, setFiscalYear] = useState<string>(FISCAL_YEARS[1])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TaxTarget | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/tax-targets?fiscalYear=${encodeURIComponent(fiscalYear)}`).then(r => r.json()),
      fetch('/api/sub-cities').then(r => r.json()),
      fetch('/api/woredas').then(r => r.json()),
      fetch('/api/teams').then(r => r.json()),
    ]).then(([d, sc, w, t]) => {
      setTargets(d.targets || [])
      setReconciliation(d.reconciliation || [])
      setSubCities(sc)
      setWoredas(w)
      setTeams(t)
    }).finally(() => setLoading(false))
  }, [fiscalYear])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm({ ...emptyForm, fiscalYear }); setEditing(null); setOpen(true) }
  const openEdit = (t: TaxTarget) => {
    setEditing(t)
    setForm({
      fiscalYear: t.fiscalYear, level: t.level, category: t.category,
      expectedAmount: String(t.expectedAmount), notes: t.notes || '',
      subCityId: t.subCityId || 'NONE', woredaId: t.woredaId || 'NONE', teamId: t.teamId || 'NONE',
    })
    setOpen(true)
  }

  const save = async () => {
    if (!form.expectedAmount) { toast({ title: 'Missing', description: 'Amount is required.', variant: 'destructive' }); return }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        fiscalYear: form.fiscalYear, category: form.category,
        expectedAmount: Number(form.expectedAmount), notes: form.notes || null,
      }
      if (form.level === 'SUBCITY') payload.subCityId = form.subCityId !== 'NONE' ? form.subCityId : null
      if (form.level === 'WOREDA') payload.woredaId = form.woredaId !== 'NONE' ? form.woredaId : null
      if (form.level === 'TEAM') payload.teamId = form.teamId !== 'NONE' ? form.teamId : null

      const res = await fetch(editing ? `/api/tax-targets/${editing.id}` : '/api/tax-targets', {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast({ title: editing ? 'Target updated' : 'Target created', description: `${categoryLabel(form.category)} — ${fmtETB(Number(form.expectedAmount))}` })
      setOpen(false); load()
    } catch (e: unknown) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const remove = async (t: TaxTarget) => {
    if (!confirm(`Delete target for ${categoryLabel(t.category)}?`)) return
    const res = await fetch(`/api/tax-targets/${t.id}`, { method: 'DELETE' })
    if (res.ok) { toast({ title: 'Target deleted' }); load() }
  }

  // Group targets by level
  const grouped: Record<string, TaxTarget[]> = { CITY: [], SUBCITY: [], WOREDA: [], TEAM: [] }
  for (const t of targets) {
    if (!grouped[t.level]) grouped[t.level] = []
    grouped[t.level].push(t)
  }

  const totalByLevel = (level: string) => grouped[level]?.reduce((s, t) => s + t.expectedAmount, 0) || 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Target className="h-5 w-5 text-primary" />Tax Targets — Cascade</h2>
          <p className="text-sm text-muted-foreground mt-1">Set targets at city, sub-city, woreda, and team levels. Child targets should sum to the parent.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={fiscalYear} onValueChange={setFiscalYear}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{FISCAL_YEARS.map(fy => <SelectItem key={fy} value={fy}>{fy}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Target</Button>
        </div>
      </div>

      {/* Reconciliation summary */}
      {reconciliation.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-600" />Reconciliation: City vs Sub-City</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reconciliation.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  {r.isBalanced ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
                  <span className="font-medium">{categoryLabel(r.parentCategory)}</span>
                </span>
                <span className="flex items-center gap-2 text-xs">
                  <span>Parent: {fmtETB(r.parentAmount)}</span>
                  <span>Children sum: {fmtETB(r.childrenSum)}</span>
                  <Badge variant={r.isBalanced ? 'secondary' : 'destructive'} className="text-[10px]">
                    {r.isBalanced ? 'Balanced' : `Diff: ${fmtETB(Math.abs(r.difference))}`}
                  </Badge>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Targets by level */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : targets.length === 0 ? (
        <Card><CardContent className="p-8 text-center"><Target className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">No targets for {fiscalYear}. Click &quot;Add Target&quot;.</p></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {LEVELS.map(lvl => {
            const items = grouped[lvl.value]
            if (!items || items.length === 0) return null
            return (
              <Card key={lvl.value}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      <Badge variant="secondary" className={LEVEL_TONE[lvl.value]}>{lvl.label}</Badge>
                      {items.length} target(s)
                    </span>
                    <Badge variant="outline">{fmtETB(totalByLevel(lvl.value))}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {items.map(t => (
                      <div key={t.id} className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{categoryLabel(t.category)}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.subCity?.name || ''}{t.woreda?.name ? ` → ${t.woreda.name}` : ''}{t.team?.name ? ` → ${t.team.name}` : ''}
                            {!t.subCity && !t.woreda && !t.team && 'City-wide'}
                            {t.notes && ` · ${t.notes}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{fmtETB(t.expectedAmount)}</span>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" />{editing ? 'Edit Target' : 'Add Target'}</DialogTitle>
            <DialogDescription>Set a tax collection target at any hierarchy level.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fiscal Year</Label>
                <Select value={form.fiscalYear} onValueChange={v => setForm({...form, fiscalYear: v})} disabled={!!editing}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FISCAL_YEARS.map(fy => <SelectItem key={fy} value={fy}>{fy}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Select value={form.level} onValueChange={v => setForm({...form, level: v, subCityId: 'NONE', woredaId: 'NONE', teamId: 'NONE'})} disabled={!!editing}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({...form, category: v})} disabled={!!editing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TAX_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.level === 'SUBCITY' && (
              <div className="space-y-1.5">
                <Label>Sub-City *</Label>
                <Select value={form.subCityId} onValueChange={v => setForm({...form, subCityId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{subCities.map(sc => <SelectItem key={sc.id} value={sc.id}>{sc.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.level === 'WOREDA' && (
              <div className="space-y-1.5">
                <Label>Woreda *</Label>
                <Select value={form.woredaId} onValueChange={v => setForm({...form, woredaId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{woredas.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.level === 'TEAM' && (
              <div className="space-y-1.5">
                <Label>Team *</Label>
                <Select value={form.teamId} onValueChange={v => setForm({...form, teamId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Expected Amount (ETB) *</Label>
              <Input type="number" min="0" step="0.01" value={form.expectedAmount} onChange={e => setForm({...form, expectedAmount: e.target.value})} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
