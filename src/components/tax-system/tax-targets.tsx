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
import { useToast } from '@/hooks/use-toast'
import { TAX_CATEGORIES, FISCAL_YEARS, fmtETB, categoryLabel } from './lib'
import { Target, Plus, Pencil, Trash2, Save, Building2, AlertCircle } from 'lucide-react'

interface Woreda {
  id: string
  code: string
  name: string
}

interface TaxTarget {
  id: string
  fiscalYear: string
  woredaId: string | null
  woreda: Woreda | null
  category: string
  expectedAmount: number
  notes: string | null
  setBy: { id: string; fullName: string } | null
  createdAt: string
  updatedAt: string
}

const emptyForm = {
  fiscalYear: FISCAL_YEARS[1],
  woredaId: 'NONE',
  category: 'BUSINESS',
  expectedAmount: '',
  notes: '',
}

export function TaxTargets() {
  const { toast } = useToast()
  const [targets, setTargets] = useState<TaxTarget[]>([])
  const [woredas, setWoredas] = useState<Woreda[]>([])
  const [loading, setLoading] = useState(true)
  const [fiscalYear, setFiscalYear] = useState<string>(FISCAL_YEARS[1])

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TaxTarget | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/tax-targets?fiscalYear=${encodeURIComponent(fiscalYear)}`)
      const d = await r.json()
      setTargets(d.targets || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [fiscalYear])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    fetch('/api/woredas')
      .then((r) => r.json())
      .then((d) => setWoredas(d))
      .catch(() => {})
  }, [])

  const openCreate = () => {
    setForm({ ...emptyForm, fiscalYear })
    setEditing(null)
    setOpen(true)
  }

  const openEdit = (t: TaxTarget) => {
    setEditing(t)
    setForm({
      fiscalYear: t.fiscalYear,
      woredaId: t.woredaId || 'NONE',
      category: t.category,
      expectedAmount: String(t.expectedAmount),
      notes: t.notes || '',
    })
    setOpen(true)
  }

  const save = async () => {
    if (!form.fiscalYear || !form.category || !form.expectedAmount) {
      toast({
        title: 'Missing fields',
        description: 'Fiscal year, category and expected amount are required.',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const payload = {
        fiscalYear: form.fiscalYear,
        woredaId: form.woredaId === 'NONE' ? null : form.woredaId,
        category: form.category,
        expectedAmount: Number(form.expectedAmount),
        notes: form.notes,
      }
      let res
      if (editing) {
        res = await fetch(`/api/tax-targets/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/tax-targets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      toast({
        title: editing ? 'Target updated' : 'Target created',
        description: `${categoryLabel(form.category)} — ${fmtETB(Number(form.expectedAmount))}${
          form.woredaId !== 'NONE' ? ` (Woreda ${woredas.find((w) => w.id === form.woredaId)?.code})` : ' (city-wide)'
        }`,
      })
      setOpen(false)
      load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (t: TaxTarget) => {
    if (!confirm(`Delete this target?\n${categoryLabel(t.category)} — ${fmtETB(t.expectedAmount)}`))
      return
    const res = await fetch(`/api/tax-targets/${t.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Target deleted' })
      load()
    } else {
      const d = await res.json()
      toast({ title: 'Error', description: d.error, variant: 'destructive' })
    }
  }

  // Group targets by woredaId for display
  const grouped = new Map<string, TaxTarget[]>()
  for (const t of targets) {
    const key = t.woredaId || '__none__'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(t)
  }

  const totalExpected = targets.reduce((s, t) => s + t.expectedAmount, 0)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Yearly Tax Targets
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set the expected tax to be collected per category (city-wide or per woreda) for each fiscal year.
            The Revenue Dashboard compares these targets against actual collections.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="fy" className="text-xs text-muted-foreground">
            Fiscal Year:
          </Label>
          <Select value={fiscalYear} onValueChange={setFiscalYear}>
            <SelectTrigger id="fy" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FISCAL_YEARS.map((fy) => (
                <SelectItem key={fy} value={fy}>
                  {fy}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New Target
          </Button>
        </div>
      </div>

      {/* Summary card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">
              Total expected for {fiscalYear}
            </p>
            <p className="text-2xl font-bold tracking-tight">{fmtETB(totalExpected)}</p>
          </div>
          <Badge variant="secondary">{targets.length} target(s)</Badge>
        </CardContent>
      </Card>

      {/* Targets grouped by woreda */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : targets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No targets set for {fiscalYear}. Click “New Target” to set the first one.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Without targets, the Revenue Dashboard will show 0% collection rate.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([key, items]) => {
            const woreda = key === '__none__' ? null : woredas.find((w) => w.id === key)
            const isCityWide = key === '__none__'
            const groupTotal = items.reduce((s, t) => s + t.expectedAmount, 0)
            return (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      {isCityWide ? (
                        <>
                          <Building2 className="h-4 w-4 text-primary" />
                          City-wide (all woredas)
                        </>
                      ) : (
                        <>
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {woreda?.name || 'Unknown woreda'}
                          <Badge variant="outline" className="text-[10px]">
                            Code {woreda?.code || '—'}
                          </Badge>
                        </>
                      )}
                    </span>
                    <Badge variant="secondary">{fmtETB(groupTotal)}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {items.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 flex flex-wrap items-center gap-3 hover:bg-muted/30"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {categoryLabel(t.category)}
                          </p>
                          {t.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {t.notes}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Set by {t.setBy?.fullName || '—'} · updated{' '}
                            {new Date(t.updatedAt).toLocaleDateString('en-GB')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{fmtETB(t.expectedAmount)}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(t)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => remove(t)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {editing ? 'Edit Tax Target' : 'New Tax Target'}
            </DialogTitle>
            <DialogDescription>
              Set the expected tax to be collected for a category in a fiscal year. Use “City-wide” for the
              whole-city target, or pick a woreda to set a woreda-specific target.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fiscal Year *</Label>
                <Select
                  value={form.fiscalYear}
                  onValueChange={(v) => setForm({ ...form, fiscalYear: v })}
                  disabled={!!editing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FISCAL_YEARS.map((fy) => (
                      <SelectItem key={fy} value={fy}>
                        {fy}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                  disabled={!!editing}
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
            </div>

            <div className="space-y-1.5">
              <Label>Scope *</Label>
              <Select
                value={form.woredaId}
                onValueChange={(v) => setForm({ ...form, woredaId: v })}
                disabled={!!editing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">City-wide (all woredas)</SelectItem>
                  {woredas.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      Woreda {w.code} — {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Expected Amount (ETB) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.expectedAmount}
                onChange={(e) => setForm({ ...form, expectedAmount: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Total the city expects to collect for this category in this fiscal year.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Based on 2025/2026 actuals + 10% growth"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? (
                'Saving…'
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {editing ? 'Save Changes' : 'Create Target'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
