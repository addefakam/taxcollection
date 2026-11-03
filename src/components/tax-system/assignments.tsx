'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
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
} from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'
import { useRole } from './role-context'
import {
  TAX_TYPES,
  PERIODS,
  FISCAL_YEARS,
  BANKS,
  STATUS_META,
  AssignmentStatus,
  fmtETB,
  fmtDate,
  fmtDateShort,
  categoryLabel,
} from './lib'
import {
  ClipboardList,
  Search,
  Plus,
  Receipt,
  CheckCircle2,
  XCircle,
  History,
  Banknote,
  FileText,
  Building2,
  User,
  Calendar,
  Landmark,
} from 'lucide-react'

interface Assignment {
  id: string
  referenceNo: string
  taxPayerId: string
  fiscalYear: string
  period: string
  taxType: string
  description?: string | null
  amountDue: number
  assignedBy: string
  assignedAt: string
  dueDate?: string | null
  status: AssignmentStatus
  bankName?: string | null
  bankReceiptNumber?: string | null
  paymentDate?: string | null
  paymentAmount?: number | null
  bankReceiptNote?: string | null
  bankReceiptReceivedBy?: string | null
  bankReceiptReceivedAt?: string | null
  governmentReceiptNumber?: string | null
  governmentReceiptIssuedBy?: string | null
  governmentReceiptIssuedAt?: string | null
  governmentReceiptNote?: string | null
  notes?: string | null
  taxPayer: {
    id: string
    tin: string
    fullName: string
    category: string
    phone?: string | null
  }
}

interface TaxPayerOption {
  id: string
  tin: string
  fullName: string
  category: string
  active: boolean
}

const emptyForm = {
  taxPayerId: '',
  fiscalYear: FISCAL_YEARS[1],
  period: 'Q1',
  taxType: TAX_TYPES[0],
  description: '',
  amountDue: '',
  dueDate: '',
}

const emptyBankForm = {
  bankName: '',
  bankReceiptNumber: '',
  paymentDate: '',
  paymentAmount: '',
  bankReceiptNote: '',
}

export function Assignments() {
  const { role, staffName } = useRole()
  const canAssign = role === 'LEADER' || role === 'TEAM_1_ASSIGNMENT'
  const canReceive = role === 'LEADER' || role === 'TEAM_2_FINANCE'
  const { toast } = useToast()

  const [list, setList] = useState<Assignment[]>([])
  const [taxpayers, setTaxpayers] = useState<TaxPayerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [bankAssignment, setBankAssignment] = useState<Assignment | null>(null)
  const [bankForm, setBankForm] = useState(emptyBankForm)
  const [bankSaving, setBankSaving] = useState(false)

  const [govAssignment, setGovAssignment] = useState<Assignment | null>(null)
  const [govReceiptNo, setGovReceiptNo] = useState('')
  const [govNote, setGovNote] = useState('')
  const [govSaving, setGovSaving] = useState(false)

  const [detail, setDetail] = useState<Assignment | null>(null)
  const [detailHistory, setDetailHistory] = useState<Array<{
    id: string
    action: string
    fromStatus: string | null
    toStatus: string | null
    performedBy: string
    note: string | null
    timestamp: string
  }> | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (statusFilter) params.set('status', statusFilter)
    fetch(`/api/assignments?${params}`)
      .then((r) => r.json())
      .then((d) => setList(d))
      .finally(() => setLoading(false))
  }, [q, statusFilter])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  useEffect(() => {
    fetch('/api/taxpayers?active=true')
      .then((r) => r.json())
      .then((d) => setTaxpayers(d))
  }, [])

  const openCreate = () => {
    setForm(emptyForm)
    setCreateOpen(true)
  }

  const openBankReceipt = (a: Assignment) => {
    setBankAssignment(a)
    setBankForm({
      ...emptyBankForm,
      paymentAmount: String(a.amountDue),
      paymentDate: new Date().toISOString().split('T')[0],
    })
  }

  const openGovReceipt = (a: Assignment) => {
    setGovAssignment(a)
    setGovReceiptNo('')
    setGovNote('')
  }

  const openDetail = async (a: Assignment) => {
    setDetail(a)
    setDetailHistory(null)
    setDetailLoading(true)
    try {
      const [full, hist] = await Promise.all([
        fetch(`/api/assignments/${a.id}`).then((r) => r.json()),
        fetch(`/api/assignments/${a.id}/history`).then((r) => r.json()),
      ])
      setDetail(full)
      setDetailHistory(hist)
    } finally {
      setDetailLoading(false)
    }
  }

  const save = async () => {
    if (!form.taxPayerId || !form.amountDue) {
      toast({
        title: 'Missing fields',
        description: 'Please select a tax payer and enter the tax amount.',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amountDue: Number(form.amountDue),
          assignedBy: staffName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast({
        title: 'Tax assigned',
        description: `${data.referenceNo} — ${data.taxPayer.fullName} (${fmtETB(data.amountDue)})`,
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

  const submitBankReceipt = async () => {
    if (!bankAssignment) return
    if (!bankForm.bankName || !bankForm.bankReceiptNumber || !bankForm.paymentAmount) {
      toast({
        title: 'Missing fields',
        description: 'Bank, receipt number, and amount are required.',
        variant: 'destructive',
      })
      return
    }
    setBankSaving(true)
    try {
      const res = await fetch(`/api/assignments/${bankAssignment.id}/bank-receipt`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bankForm,
          paymentAmount: Number(bankForm.paymentAmount),
          performedBy: staffName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast({
        title: 'Bank receipt recorded',
        description: `${bankAssignment.referenceNo} — awaiting government receipt issuance.`,
      })
      setBankAssignment(null)
      load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setBankSaving(false)
    }
  }

  const issueGovReceipt = async () => {
    if (!govAssignment) return
    setGovSaving(true)
    try {
      const res = await fetch(`/api/assignments/${govAssignment.id}/government-receipt`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          governmentReceiptNumber: govReceiptNo,
          governmentReceiptNote: govNote,
          performedBy: staffName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast({
        title: 'Government receipt issued',
        description: `${data.governmentReceiptNumber} — Process complete for ${govAssignment.taxPayer.fullName}.`,
      })
      setGovAssignment(null)
      load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setGovSaving(false)
    }
  }

  const cancelAssignment = async (a: Assignment) => {
    const reason = prompt(`Cancel assignment ${a.referenceNo}? Enter reason:`)
    if (reason === null) return
    const res = await fetch(`/api/assignments/${a.id}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, performedBy: staffName }),
    })
    if (res.ok) {
      toast({ title: 'Assignment cancelled', description: a.referenceNo })
      load()
    } else {
      const d = await res.json()
      toast({ title: 'Error', description: d.error, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by reference no, TIN, name, or receipt number..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter || 'ALL'}
          onValueChange={(v) => setStatusFilter(v === 'ALL' ? '' : v)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canAssign && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New Assignment
          </Button>
        )}
      </div>

      {/* Quick filter chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { k: '', label: 'All' },
          { k: 'ASSIGNED', label: `Awaiting Payment (${STATUS_META.ASSIGNED.label})` },
          { k: 'BANK_RECEIPT_SUBMITTED', label: STATUS_META.BANK_RECEIPT_SUBMITTED.label },
          { k: 'COMPLETED', label: STATUS_META.COMPLETED.label },
          { k: 'CANCELLED', label: STATUS_META.CANCELLED.label },
        ].map((c) => (
          <button
            key={c.k || 'all'}
            onClick={() => setStatusFilter(c.k)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              statusFilter === c.k
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" />
            Tax Assignments
            <Badge variant="secondary" className="ml-1">
              {loading ? '…' : list.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="p-8 text-center">
              <ClipboardList className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No assignments match. {canAssign && 'Click "New Assignment" to start a tax collection.'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {list.map((a) => {
                const m = STATUS_META[a.status]
                return (
                  <div
                    key={a.id}
                    className="p-4 hover:bg-muted/40 cursor-pointer"
                    onClick={() => openDetail(a)}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {a.referenceNo}
                          </Badge>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${m.bg} ${m.text}`}
                          >
                            {m.label}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold">{a.taxPayer.fullName}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {a.taxPayer.tin} · {categoryLabel(a.taxPayer.category)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span>{a.taxType}</span>
                          <span>·</span>
                          <span>{a.fiscalYear} {a.period}</span>
                          <span>·</span>
                          <span>Due: {fmtDateShort(a.dueDate)}</span>
                          {a.bankReceiptNumber && (
                            <>
                              <span>·</span>
                              <span className="text-sky-600 dark:text-sky-400">
                                Bank: {a.bankReceiptNumber}
                              </span>
                            </>
                          )}
                          {a.governmentReceiptNumber && (
                            <>
                              <span>·</span>
                              <span className="text-emerald-600 dark:text-emerald-400">
                                GR: {a.governmentReceiptNumber}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-2">
                        <div>
                          <p className="text-lg font-bold">{fmtETB(a.amountDue)}</p>
                          {a.paymentAmount !== null && a.paymentAmount !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              Paid: {fmtETB(a.paymentAmount)}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                          {canReceive && a.status === 'ASSIGNED' && (
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1.5"
                              onClick={() => openBankReceipt(a)}
                            >
                              <Receipt className="h-3.5 w-3.5" /> Receive Bank Receipt
                            </Button>
                          )}
                          {canReceive && a.status === 'BANK_RECEIPT_SUBMITTED' && (
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => openGovReceipt(a)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Issue Govt Receipt
                            </Button>
                          )}
                          {(role === 'LEADER') && a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => cancelAssignment(a)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDetail(a)}
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create assignment dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              New Tax Assignment (Team 1)
            </DialogTitle>
            <DialogDescription>
              Assign a tax obligation to a tax payer. The tax payer will be notified to pay at the bank.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Tax Payer *</Label>
              <Select
                value={form.taxPayerId}
                onValueChange={(v) => setForm({ ...form, taxPayerId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a tax payer..." />
                </SelectTrigger>
                <SelectContent>
                  {taxpayers.map((tp) => (
                    <SelectItem key={tp.id} value={tp.id}>
                      <span className="font-mono text-xs mr-2">{tp.tin}</span>
                      {tp.fullName}
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        {categoryLabel(tp.category)}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Tax Type *</Label>
              <Select
                value={form.taxType}
                onValueChange={(v) => setForm({ ...form, taxType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAX_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Amount Due (ETB) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amountDue}
                onChange={(e) => setForm({ ...form, amountDue: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Fiscal Year *</Label>
              <Select
                value={form.fiscalYear}
                onValueChange={(v) => setForm({ ...form, fiscalYear: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FISCAL_YEARS.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Period *</Label>
              <Select
                value={form.period}
                onValueChange={(v) => setForm({ ...form, period: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description / Note</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional note about this tax obligation"
                rows={2}
              />
            </div>
          </div>

          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            Assigned by: <span className="font-medium">{staffName}</span> (Team 1)
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Create Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank receipt dialog */}
      <Dialog open={!!bankAssignment} onOpenChange={(o) => !o && setBankAssignment(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Receive Bank Receipt
            </DialogTitle>
            <DialogDescription>
              Tax payer returned with a bank receipt. Record the payment details below.
            </DialogDescription>
          </DialogHeader>

          {bankAssignment && (
            <div className="rounded-md border border-border/60 p-3 bg-muted/30 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs">{bankAssignment.referenceNo}</span>
                <Badge variant="outline">{bankAssignment.status.replace(/_/g, ' ')}</Badge>
              </div>
              <p className="font-medium">{bankAssignment.taxPayer.fullName}</p>
              <p className="text-xs text-muted-foreground">
                {bankAssignment.taxPayer.tin} · {bankAssignment.taxType}
              </p>
              <p className="text-sm font-semibold pt-1">
                Amount Due: {fmtETB(bankAssignment.amountDue)}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Bank *</Label>
              <Select
                value={bankForm.bankName}
                onValueChange={(v) => setBankForm({ ...bankForm, bankName: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bank..." />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Bank Receipt No. *</Label>
              <Input
                value={bankForm.bankReceiptNumber}
                onChange={(e) =>
                  setBankForm({ ...bankForm, bankReceiptNumber: e.target.value })
                }
                placeholder="e.g. CBE-78451236"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={bankForm.paymentDate}
                onChange={(e) => setBankForm({ ...bankForm, paymentDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Amount Paid (ETB) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={bankForm.paymentAmount}
                onChange={(e) =>
                  setBankForm({ ...bankForm, paymentAmount: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={bankForm.bankReceiptNote}
                onChange={(e) =>
                  setBankForm({ ...bankForm, bankReceiptNote: e.target.value })
                }
                rows={2}
                placeholder="Any remark about this payment"
              />
            </div>
          </div>

          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            Received by: <span className="font-medium">{staffName}</span> (Team 2 — Finance Office)
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBankAssignment(null)} disabled={bankSaving}>
              Cancel
            </Button>
            <Button onClick={submitBankReceipt} disabled={bankSaving}>
              {bankSaving ? 'Saving…' : 'Save Bank Receipt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Government receipt dialog */}
      <Dialog open={!!govAssignment} onOpenChange={(o) => !o && setGovAssignment(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Issue Government Receipt
            </DialogTitle>
            <DialogDescription>
              Confirm payment and issue the official government receipt to the tax payer. This completes the process.
            </DialogDescription>
          </DialogHeader>

          {govAssignment && (
            <div className="rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs">{govAssignment.referenceNo}</span>
                <Badge className="bg-emerald-600">Ready to complete</Badge>
              </div>
              <p className="font-medium">{govAssignment.taxPayer.fullName}</p>
              <p className="text-xs text-muted-foreground">
                {govAssignment.taxPayer.tin} · {govAssignment.taxType}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Bank:</span>{' '}
                  <span className="font-medium">{govAssignment.bankName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Bank Receipt:</span>{' '}
                  <span className="font-medium">{govAssignment.bankReceiptNumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Paid:</span>{' '}
                  <span className="font-medium">{fmtETB(govAssignment.paymentAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Pay Date:</span>{' '}
                  <span className="font-medium">{fmtDateShort(govAssignment.paymentDate)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Government Receipt No.</Label>
            <Input
              value={govReceiptNo}
              onChange={(e) => setGovReceiptNo(e.target.value)}
              placeholder="Auto-generated if left blank"
            />
            <p className="text-xs text-muted-foreground">
              Format suggestion: GR-2026-XXXX
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Textarea
              value={govNote}
              onChange={(e) => setGovNote(e.target.value)}
              rows={2}
              placeholder="Any final note"
            />
          </div>

          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            Issued by: <span className="font-medium">{staffName}</span> (Team 2 — Finance Office)
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGovAssignment(null)} disabled={govSaving}>
              Cancel
            </Button>
            <Button
              onClick={issueGovReceipt}
              disabled={govSaving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {govSaving ? 'Issuing…' : 'Issue Receipt & Complete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail sheet with history timeline */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {detail.referenceNo}
                </SheetTitle>
                <SheetDescription>{detail.taxPayer.fullName}</SheetDescription>
              </SheetHeader>

              <div className="px-4 pb-6 space-y-4">
                {/* Workflow progress bar */}
                <WorkflowProgress status={detail.status} />

                {/* Summary card */}
                <Card>
                  <CardContent className="p-4 space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Tax Payer</p>
                        <p className="font-medium">{detail.taxPayer.fullName}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {detail.taxPayer.tin}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tax Type</p>
                        <p className="font-medium">{detail.taxType}</p>
                        <p className="text-xs text-muted-foreground">
                          {detail.fiscalYear} · {detail.period}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Amount Due</p>
                        <p className="font-semibold">{fmtETB(detail.amountDue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Due Date</p>
                        <p className="font-medium">{fmtDateShort(detail.dueDate)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bank receipt info */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-sky-500" /> Bank Payment
                  </h4>
                  <Card>
                    <CardContent className="p-4 text-sm">
                      {detail.bankReceiptNumber ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Bank</p>
                            <p className="font-medium">{detail.bankName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Receipt No.</p>
                            <p className="font-medium font-mono">
                              {detail.bankReceiptNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Amount Paid</p>
                            <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {fmtETB(detail.paymentAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Payment Date</p>
                            <p className="font-medium">
                              {fmtDateShort(detail.paymentDate)}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">Received by</p>
                            <p className="font-medium">
                              {detail.bankReceiptReceivedBy || '—'} ·{' '}
                              {fmtDate(detail.bankReceiptReceivedAt)}
                            </p>
                          </div>
                          {detail.bankReceiptNote && (
                            <div className="col-span-2">
                              <p className="text-xs text-muted-foreground">Note</p>
                              <p className="text-sm">{detail.bankReceiptNote}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Awaiting bank payment by tax payer.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Government receipt info */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Government Receipt
                  </h4>
                  <Card>
                    <CardContent className="p-4 text-sm">
                      {detail.governmentReceiptNumber ? (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Receipt No.</p>
                            <p className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                              {detail.governmentReceiptNumber}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Issued At</p>
                            <p className="font-medium">
                              {fmtDate(detail.governmentReceiptIssuedAt)}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground">Issued by</p>
                            <p className="font-medium">
                              {detail.governmentReceiptIssuedBy || '—'}
                            </p>
                          </div>
                          {detail.governmentReceiptNote && (
                            <div className="col-span-2">
                              <p className="text-xs text-muted-foreground">Note</p>
                              <p className="text-sm">{detail.governmentReceiptNote}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Government receipt not yet issued.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Timeline */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" /> Process Timeline
                  </h4>
                  {detailLoading || !detailHistory ? (
                    <Skeleton className="h-32" />
                  ) : (
                    <ol className="relative border-l border-border ml-3 space-y-4">
                      {detailHistory.map((h) => (
                        <li key={h.id} className="ml-4">
                          <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                          <div className="text-sm">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{actionLabel(h.action)}</span>
                              {h.fromStatus && h.toStatus && (
                                <span className="text-xs text-muted-foreground">
                                  ({h.fromStatus.replace(/_/g, ' ')} → {h.toStatus.replace(/_/g, ' ')})
                                </span>
                              )}
                            </div>
                            {h.note && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {h.note}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {fmtDate(h.timestamp)} · by {h.performedBy}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                {/* Action buttons at the bottom */}
                {detail.status !== 'COMPLETED' && detail.status !== 'CANCELLED' && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {canReceive && detail.status === 'ASSIGNED' && (
                      <Button
                        onClick={() => {
                          setDetail(null)
                          openBankReceipt(detail)
                        }}
                        className="gap-2"
                      >
                        <Receipt className="h-4 w-4" /> Receive Bank Receipt
                      </Button>
                    )}
                    {canReceive && detail.status === 'BANK_RECEIPT_SUBMITTED' && (
                      <Button
                        onClick={() => {
                          setDetail(null)
                          openGovReceipt(detail)
                        }}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Issue Govt Receipt
                      </Button>
                    )}
                    {role === 'LEADER' && (
                      <Button
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setDetail(null)
                          cancelAssignment(detail)
                        }}
                      >
                        <XCircle className="h-4 w-4" /> Cancel
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function WorkflowProgress({ status }: { status: AssignmentStatus }) {
  const steps = [
    { key: 'ASSIGNED', label: 'Assigned', icon: ClipboardList },
    { key: 'BANK_RECEIPT_SUBMITTED', label: 'Bank Receipt', icon: Receipt },
    { key: 'COMPLETED', label: 'Govt Receipt', icon: CheckCircle2 },
  ]
  const currentStep = STATUS_META[status].step

  return (
    <div className="flex items-center justify-between gap-1">
      {steps.map((s, i) => {
        const stepNo = i + 1
        const done = currentStep >= stepNo
        const isCurrent = currentStep === stepNo
        return (
          <div key={s.key} className="flex-1 flex items-center">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                  done
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'border-primary text-primary'
                      : 'border-border text-muted-foreground'
                }`}
              >
                <s.icon className="h-4 w-4" />
              </div>
              <span
                className={`text-[10px] font-medium ${
                  done || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 -mt-5 ${
                  currentStep > stepNo ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function actionLabel(a: string): string {
  switch (a) {
    case 'ASSIGN':
      return 'Assignment created'
    case 'BANK_RECEIPT_RECEIVED':
      return 'Bank receipt received'
    case 'VERIFY':
      return 'Bank receipt verified'
    case 'ISSUE_GOVERNMENT_RECEIPT':
      return 'Government receipt issued'
    case 'CANCEL':
      return 'Cancelled'
    case 'EDIT':
      return 'Assignment edited'
    default:
      return a
  }
}
