'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Cell,
  Pie,
  PieChart,
  Legend as RechartsLegend,
} from 'recharts'
import { useToast } from '@/hooks/use-toast'
import { useRole } from './role-context'
import {
  TAX_CATEGORIES,
  fmtETB,
  fmtNumber,
  fmtDateShort,
  categoryLabel,
} from './lib'
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Target,
  PieChart as PieChartIcon,
  BarChart3,
  LineChart as LineChartIcon,
  Edit3,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react'

interface CategorySummary {
  category: string
  categoryLabel: string
  expected: number
  hasTarget: boolean
  hasCityWideTarget: boolean
  hasWoredaTargets: boolean
  targetSetBy: string | null
  targetSetAt: string | null
  assigned: number
  collected: number
  pendingBankReceipt: number
  outstanding: number
  collectionRate: number
  assignedCount: number
  completedCount: number
  disputedCount: number
}

interface TrendPoint {
  date?: string
  week?: string
  month?: string
  year?: string
  amount: number
}

interface WoredaSummary {
  woredaId: string
  woredaCode: string
  woredaName: string
  expected: number
  collected: number
  assigned: number
  outstanding: number
  rate: number
  assignedCount: number
  completedCount: number
}

interface TopTaxpayer {
  taxPayerId: string
  tin: string
  fullName: string
  category: string
  categoryLabel: string
  woreda: { id: string; code: string; name: string } | null
  totalPaid: number
  caseCount: number
}

interface RecentPayment {
  id: string
  referenceNo: string
  taxPayerTin: string
  taxPayerName: string
  category: string
  categoryLabel: string
  taxType: string
  period: string
  paymentAmount: number
  bankName: string | null
  bankReceiptNumber: string | null
  governmentReceiptNumber: string | null
  governmentReceiptIssuedAt: string | null
  governmentReceiptIssuedByName: string | null
}

interface WoredaCategoryTarget {
  woredaId: string
  woredaCode: string
  woredaName: string
  targets: Record<string, number>
}

interface Summary {
  fiscalYear: string
  availableFiscalYears: string[]
  byCategory: CategorySummary[]
  totals: {
    expected: number
    assigned: number
    collected: number
    pendingBankReceipt: number
    outstanding: number
    assignedCount: number
    completedCount: number
    disputedCount: number
    overallCollectionRate: number
  }
  trends: {
    daily: TrendPoint[]
    weekly: TrendPoint[]
    monthly: TrendPoint[]
    yearly: TrendPoint[]
  }
  byWoreda: WoredaSummary[]
  topTaxpayers: TopTaxpayer[]
  recentPayments: RecentPayment[]
  woredaCategoryTargets: WoredaCategoryTarget[]
}

const CATEGORY_COLORS: Record<string, string> = {
  BUSINESS: 'oklch(0.55 0.13 160)',
  PROPERTY: 'oklch(0.65 0.18 50)',
  INDIVIDUAL_INCOME: 'oklch(0.7 0.15 75)',
  VEHICLE: 'oklch(0.6 0.13 200)',
  VAT: 'oklch(0.7 0.16 320)',
  WITHHOLDING: 'oklch(0.65 0.18 30)',
}

const TREND_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const
type TrendKey = (typeof TREND_OPTIONS)[number]['value']

export function CityIncome() {
  const { role } = useRole()
  const canSetTargets = role === 'LEADER' || role === 'CITY_ADMIN'
  const { toast } = useToast()

  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [fiscalYear, setFiscalYear] = useState<string>('')

  const [trendKey, setTrendKey] = useState<TrendKey>('monthly')

  // Target edit dialog (city-wide target for a category)
  const [targetDialogOpen, setTargetDialogOpen] = useState(false)
  const [targetCat, setTargetCat] = useState<string>('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetNotes, setTargetNotes] = useState('')
  const [targetSaving, setTargetSaving] = useState(false)

  // Per-woreda target dialog
  const [woredaDialogOpen, setWoredaDialogOpen] = useState(false)
  const [woredaTargetWoredaId, setWoredaTargetWoredaId] = useState<string>('')
  const [woredaTargetCat, setWoredaTargetCat] = useState<string>('BUSINESS')
  const [woredaTargetAmount, setWoredaTargetAmount] = useState('')
  const [woredaTargetSaving, setWoredaTargetSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (fiscalYear) params.set('fiscalYear', fiscalYear)
    fetch(`/api/income/summary?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setSummary(d)
        if (!fiscalYear && d.fiscalYear) setFiscalYear(d.fiscalYear)
      })
      .finally(() => setLoading(false))
  }, [fiscalYear])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  const openTargetDialog = (cat: string) => {
    const existing = summary?.byCategory.find((c) => c.category === cat)
    setTargetCat(cat)
    setTargetAmount(existing?.hasCityWideTarget ? String(existing.expected) : '')
    setTargetNotes('')
    setTargetDialogOpen(true)
  }

  const openWoredaTargetDialog = (woredaId?: string, cat?: string) => {
    setWoredaTargetWoredaId(woredaId || '')
    setWoredaTargetCat(cat || 'BUSINESS')
    // Pre-fill if a target exists
    if (woredaId && cat && summary?.woredaCategoryTargets) {
      const w = summary.woredaCategoryTargets.find((w) => w.woredaId === woredaId)
      const existing = w?.targets[cat]
      setWoredaTargetAmount(existing ? String(existing) : '')
    } else {
      setWoredaTargetAmount('')
    }
    setWoredaDialogOpen(true)
  }

  const saveTarget = async () => {
    if (!targetCat || !targetAmount) {
      toast({
        title: 'Missing fields',
        description: 'Category and expected amount are required.',
        variant: 'destructive',
      })
      return
    }
    const amount = Number(targetAmount)
    if (isNaN(amount) || amount < 0) {
      toast({
        title: 'Invalid amount',
        description: 'Expected amount must be a non-negative number.',
        variant: 'destructive',
      })
      return
    }
    setTargetSaving(true)
    try {
      const res = await fetch('/api/income/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fiscalYear: summary?.fiscalYear,
          category: targetCat,
          expectedAmount: amount,
          notes: targetNotes,
          // woredaId omitted = city-wide target
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast({
        title: 'City-wide target saved',
        description: `${categoryLabel(targetCat)} target for ${summary?.fiscalYear}: ${fmtETB(amount)}`,
      })
      setTargetDialogOpen(false)
      load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setTargetSaving(false)
    }
  }

  const saveWoredaTarget = async () => {
    if (!woredaTargetWoredaId || !woredaTargetCat || !woredaTargetAmount) {
      toast({
        title: 'Missing fields',
        description: 'Woreda, category and amount are required.',
        variant: 'destructive',
      })
      return
    }
    const amount = Number(woredaTargetAmount)
    if (isNaN(amount) || amount < 0) {
      toast({
        title: 'Invalid amount',
        description: 'Expected amount must be a non-negative number.',
        variant: 'destructive',
      })
      return
    }
    setWoredaTargetSaving(true)
    try {
      const res = await fetch('/api/income/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fiscalYear: summary?.fiscalYear,
          woredaId: woredaTargetWoredaId,
          category: woredaTargetCat,
          expectedAmount: amount,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      const woredaName =
        summary?.byWoreda.find((w) => w.woredaId === woredaTargetWoredaId)?.woredaName ||
        'woreda'
      toast({
        title: 'Per-woreda target saved',
        description: `${woredaName} · ${categoryLabel(woredaTargetCat)}: ${fmtETB(amount)}`,
      })
      setWoredaDialogOpen(false)
      load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setWoredaTargetSaving(false)
    }
  }

  if (loading || !summary) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  const {
    byCategory,
    totals,
    trends,
    availableFiscalYears,
    fiscalYear: currentFY,
    byWoreda,
    topTaxpayers,
    recentPayments,
  } = summary

  const kpis = [
    {
      label: 'Total Expected',
      value: totals.expected,
      sub: `Target for ${currentFY}`,
      icon: Target,
      tone: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
      trend: totals.expected > 0,
    },
    {
      label: 'Total Collected',
      value: totals.collected,
      sub: `${totals.completedCount} completed cases`,
      icon: CheckCircle2,
      tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      trend: true,
    },
    {
      label: 'Pending Bank Receipt',
      value: totals.pendingBankReceipt,
      sub: `Awaiting govt receipt`,
      icon: Clock,
      tone: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
      trend: true,
    },
    {
      label: 'Outstanding',
      value: totals.outstanding,
      sub: `Not yet collected`,
      icon: AlertCircle,
      tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
      trend: false,
    },
  ]

  // Chart data
  const barData = byCategory.map((c) => ({
    name: c.categoryLabel,
    category: c.category,
    Expected: c.expected,
    Collected: c.collected,
    Assigned: c.assigned,
    Outstanding: c.outstanding,
  }))

  const pieData = byCategory
    .filter((c) => c.collected > 0)
    .map((c) => ({
      name: c.categoryLabel,
      value: c.collected,
      category: c.category,
    }))

  const trendData =
    trendKey === 'daily'
      ? trends.daily.map((t) => ({ name: t.date, amount: t.amount }))
      : trendKey === 'weekly'
        ? trends.weekly.map((t) => ({ name: t.week, amount: t.amount }))
        : trendKey === 'monthly'
          ? trends.monthly.map((t) => ({ name: t.month, amount: t.amount }))
          : trends.yearly.map((t) => ({ name: t.year, amount: t.amount }))

  const barChartConfig: ChartConfig = {
    Expected: { label: 'Expected', color: 'oklch(0.65 0.18 50)' },
    Collected: { label: 'Collected', color: 'oklch(0.55 0.13 160)' },
  }

  const lineChartConfig: ChartConfig = {
    amount: { label: 'Collected (ETB)', color: 'oklch(0.55 0.13 160)' },
  }

  const pieChartConfig: ChartConfig = {
    value: { label: 'Collected', color: 'oklch(0.55 0.13 160)' },
  }

  return (
    <div className="space-y-6">
      {/* Header + filter */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
            City Income Follow-up
          </h2>
          <p className="text-sm text-muted-foreground">
            Track expected vs collected tax by category, with daily / weekly / monthly / yearly trends.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Fiscal Year</Label>
            <Select
              value={fiscalYear || currentFY}
              onValueChange={(v) => setFiscalYear(v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableFiscalYears.map((fy) => (
                  <SelectItem key={fy} value={fy}>
                    {fy}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                  <p className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                    {fmtETB(kpi.value)}
                  </p>
                  <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                </div>
                <div className={`rounded-lg p-2 flex-shrink-0 ${kpi.tone}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Collection rate banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Overall Collection Rate — {currentFY}
              </p>
              <p className="text-3xl font-bold tracking-tight text-primary mt-1">
                {totals.overallCollectionRate}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {fmtETB(totals.collected)} collected out of{' '}
                {totals.expected > 0 ? (
                  <>
                    {fmtETB(totals.expected)} target
                  </>
                ) : (
                  <>
                    {fmtETB(totals.assigned)} assigned
                  </>
                )}
              </p>
            </div>
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
                  style={{ width: `${Math.min(totals.overallCollectionRate, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts row 1: bar + pie */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Expected vs Collected by category */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-primary" />
              Expected vs Collected — by Category
            </CardTitle>
            <CardDescription>
              Target amount set vs actually collected, per tax payer category for {currentFY}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {barData.every((d) => d.Expected === 0 && d.Collected === 0) ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No data for this fiscal year yet.
              </div>
            ) : (
              <ChartContainer config={barChartConfig} className="h-72 w-full">
                <BarChart data={barData} accessibilityLayer>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                    fontSize={11}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(v: number | string) => fmtETB(Number(v))}
                      />
                    }
                  />
                  <Bar dataKey="Expected" fill="var(--color-Expected)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Collected" fill="var(--color-Collected)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie chart: collection distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Collection Mix
            </CardTitle>
            <CardDescription>
              Share of total collected by category.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No collections yet.
              </div>
            ) : (
              <ChartContainer config={pieChartConfig} className="h-72 w-full">
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(v: number | string) => fmtETB(Number(v))}
                      />
                    }
                  />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.category}
                        fill={CATEGORY_COLORS[entry.category] || 'oklch(0.6 0.13 160)'}
                      />
                    ))}
                  </Pie>
                  <RechartsLegend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: trend line */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <LineChartIcon className="h-4 w-4 text-primary" />
                Collected Tax — Trend
              </CardTitle>
              <CardDescription>
                Cumulative collected ETB by {trendKey} period for {currentFY}.
              </CardDescription>
            </div>
            <div className="flex gap-1 rounded-md border bg-muted/40 p-0.5">
              {TREND_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTrendKey(t.value)}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    trendKey === t.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No completed collections in this period yet.
            </div>
          ) : (
            <ChartContainer config={lineChartConfig} className="h-72 w-full">
              <LineChart data={trendData} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                />
                <YAxis
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                  fontSize={11}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(v: number | string) => fmtETB(Number(v))}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--color-amount)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: 'var(--color-amount)' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Category detail table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-4 w-4 text-primary" />
            Per-Category Breakdown — {currentFY}
          </CardTitle>
          <CardDescription>
            Expected, collected, outstanding, and counts for each tax payer category.
            {canSetTargets && ' Click "Set Target" to set the expected yearly amount.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Category</th>
                  <th className="px-4 py-2 text-right font-medium">Expected (Target)</th>
                  <th className="px-4 py-2 text-right font-medium">Assigned</th>
                  <th className="px-4 py-2 text-right font-medium">Collected</th>
                  <th className="px-4 py-2 text-right font-medium">Pending</th>
                  <th className="px-4 py-2 text-right font-medium">Outstanding</th>
                  <th className="px-4 py-2 text-center font-medium">Rate</th>
                  <th className="px-4 py-2 text-center font-medium">Cases</th>
                  {canSetTargets && (
                    <th className="px-4 py-2 text-right font-medium">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {byCategory.map((c) => (
                  <tr key={c.category} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[c.category] }}
                        />
                        <span className="font-medium">{c.categoryLabel}</span>
                        {c.disputedCount > 0 && (
                          <Badge variant="destructive" className="text-[10px]">
                            {c.disputedCount} disputed
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.hasTarget ? (
                        <span className="font-semibold text-violet-700 dark:text-violet-300">
                          {fmtETB(c.expected)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Not set
                          {canSetTargets && (
                            <span className="block text-[10px] text-primary">
                              (uses assigned)
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{fmtETB(c.assigned)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                      {fmtETB(c.collected)}
                    </td>
                    <td className="px-4 py-3 text-right text-sky-700 dark:text-sky-400">
                      {fmtETB(c.pendingBankReceipt)}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-700 dark:text-amber-400">
                      {fmtETB(c.outstanding)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-semibold">{c.collectionRate}%</span>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.min(c.collectionRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-xs">
                        <Badge variant="secondary">{c.completedCount}</Badge>
                        <span className="text-muted-foreground ml-1">/ {c.assignedCount}</span>
                      </div>
                    </td>
                    {canSetTargets && (
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant={c.hasTarget ? 'outline' : 'default'}
                          onClick={() => openTargetDialog(c.category)}
                          className="gap-1.5"
                        >
                          <Edit3 className="h-3 w-3" />
                          {c.hasTarget ? 'Edit Target' : 'Set Target'}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="px-4 py-3">TOTAL</td>
                  <td className="px-4 py-3 text-right text-violet-700 dark:text-violet-300">
                    {fmtETB(totals.expected)}
                  </td>
                  <td className="px-4 py-3 text-right">{fmtETB(totals.assigned)}</td>
                  <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400">
                    {fmtETB(totals.collected)}
                  </td>
                  <td className="px-4 py-3 text-right text-sky-700 dark:text-sky-400">
                    {fmtETB(totals.pendingBankReceipt)}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-700 dark:text-amber-400">
                    {fmtETB(totals.outstanding)}
                  </td>
                  <td className="px-4 py-3 text-center">{totals.overallCollectionRate}%</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="secondary">
                      {fmtNumber(totals.completedCount)} / {fmtNumber(totals.assignedCount)}
                    </Badge>
                  </td>
                  {canSetTargets && <td />}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* By Woreda comparison chart + table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />
                Collection by Woreda — {currentFY}
              </CardTitle>
              <CardDescription>
                Expected vs collected tax in each sub-city (woreda).
              </CardDescription>
            </div>
            {canSetTargets && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openWoredaTargetDialog()}
                className="gap-1.5"
              >
                <Target className="h-3.5 w-3.5" /> Set Per-Woreda Target
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {byWoreda.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No woredas defined yet.
            </div>
          ) : (
            <>
              <ChartContainer
                config={{
                  Expected: { label: 'Expected', color: 'oklch(0.65 0.18 50)' },
                  Collected: { label: 'Collected', color: 'oklch(0.55 0.13 160)' },
                }}
                className="h-64 w-full mb-4"
              >
                <BarChart
                  data={byWoreda.map((w) => ({
                    name: `W${w.woredaCode}`,
                    Expected: w.expected,
                    Collected: w.collected,
                  }))}
                  accessibilityLayer
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                  <YAxis
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                    fontSize={11}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(v: number | string) => fmtETB(Number(v))} />}
                  />
                  <Bar dataKey="Expected" fill="var(--color-Expected)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Collected" fill="var(--color-Collected)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-y bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Woreda</th>
                      <th className="px-3 py-2 text-right font-medium">Expected</th>
                      <th className="px-3 py-2 text-right font-medium">Assigned</th>
                      <th className="px-3 py-2 text-right font-medium">Collected</th>
                      <th className="px-3 py-2 text-right font-medium">Outstanding</th>
                      <th className="px-3 py-2 text-center font-medium">Rate</th>
                      <th className="px-3 py-2 text-center font-medium">Cases</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {byWoreda.map((w) => (
                      <tr key={w.woredaId} className="hover:bg-muted/40">
                        <td className="px-3 py-2.5">
                          <p className="font-medium">Woreda {w.woredaCode}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                            {w.woredaName}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-right text-violet-700 dark:text-violet-300">
                          {w.expected > 0 ? fmtETB(w.expected) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right">{fmtETB(w.assigned)}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                          {fmtETB(w.collected)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-amber-700 dark:text-amber-400">
                          {fmtETB(w.outstanding)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="font-semibold">{w.rate}%</span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs">
                          <Badge variant="secondary">{w.completedCount}</Badge>
                          <span className="text-muted-foreground ml-1">/ {w.assignedCount}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Top Taxpayers + Recent Payments — two columns */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top taxpayers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Top 10 Taxpayers — {currentFY}
            </CardTitle>
            <CardDescription>
              By total amount collected (completed cases only).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {topTaxpayers.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No completed collections yet.
              </div>
            ) : (
              <div className="divide-y">
                {topTaxpayers.map((t, idx) => (
                  <div key={t.taxPayerId} className="flex items-center gap-3 p-3">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0 ${
                        idx === 0
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          : idx === 1
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : idx === 2
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                              : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{t.fullName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {t.tin} · {t.categoryLabel}
                        {t.woreda && <> · W{t.woreda.code}</>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">
                        {fmtETB(t.totalPaid)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {t.caseCount} case{t.caseCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Recent Payments — last 10
            </CardTitle>
            <CardDescription>
              Most recently completed government receipts issued.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recentPayments.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No completed collections yet.
              </div>
            ) : (
              <div className="divide-y">
                {recentPayments.map((p) => (
                  <div key={p.id} className="p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {p.referenceNo}
                        </Badge>
                        {p.governmentReceiptNumber && (
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {p.governmentReceiptNumber}
                          </Badge>
                        )}
                      </div>
                      <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">
                        {fmtETB(p.paymentAmount)}
                      </p>
                    </div>
                    <p className="text-sm font-medium truncate">{p.taxPayerName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.taxPayerTin} · {p.categoryLabel} · {p.taxType} · {p.period}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {p.governmentReceiptIssuedAt
                        ? fmtDateShort(p.governmentReceiptIssuedAt)
                        : '—'}{' '}
                      · by {p.governmentReceiptIssuedByName || '—'}
                      {p.bankName && <> · {p.bankName}</>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-woreda + per-category target matrix (Leader / City Admin only) */}
      {canSetTargets && summary.woredaCategoryTargets && summary.woredaCategoryTargets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Per-Woreda Target Matrix — {currentFY}
            </CardTitle>
            <CardDescription>
              Click any cell to set or edit the expected tax for that woreda + category.
              Empty cells have no target set.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium sticky left-0 bg-muted/40">
                      Woreda
                    </th>
                    {TAX_CATEGORIES.map((c) => (
                      <th key={c.value} className="px-3 py-2 text-right font-medium">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {summary.woredaCategoryTargets.map((row) => (
                    <tr key={row.woredaId} className="hover:bg-muted/40">
                      <td className="px-3 py-2.5 sticky left-0 bg-background">
                        <p className="font-medium">Woreda {row.woredaCode}</p>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                          {row.woredaName}
                        </p>
                      </td>
                      {TAX_CATEGORIES.map((c) => {
                        const val = row.targets[c.value] || 0
                        return (
                          <td key={c.value} className="px-3 py-2.5 text-right">
                            <button
                              onClick={() => openWoredaTargetDialog(row.woredaId, c.value)}
                              className={`text-xs font-medium hover:underline ${
                                val > 0
                                  ? 'text-violet-700 dark:text-violet-300'
                                  : 'text-muted-foreground/60'
                              }`}
                              title="Click to set/edit target"
                            >
                              {val > 0 ? fmtETB(val) : '— set —'}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Set Target Dialog (city-wide) */}
      <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Set Yearly Tax Target
            </DialogTitle>
            <DialogDescription>
              Set the expected tax the city should collect from{' '}
              <span className="font-medium text-foreground">{categoryLabel(targetCat)}</span>{' '}
              taxpayers in fiscal year{' '}
              <span className="font-medium text-foreground">{summary?.fiscalYear}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Expected Amount (ETB) *</Label>
              <Input
                type="number"
                min="0"
                step="1000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="e.g. 5,000,000"
              />
              <p className="text-xs text-muted-foreground">
                Used to calculate the collection rate vs actual collections.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Textarea
                value={targetNotes}
                onChange={(e) => setTargetNotes(e.target.value)}
                rows={2}
                placeholder="Source / basis for this target"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTargetDialogOpen(false)}
              disabled={targetSaving}
            >
              Cancel
            </Button>
            <Button onClick={saveTarget} disabled={targetSaving}>
              {targetSaving ? 'Saving…' : 'Save Target'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Per-Woreda Target Dialog */}
      <Dialog open={woredaDialogOpen} onOpenChange={setWoredaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Set Per-Woreda Tax Target
            </DialogTitle>
            <DialogDescription>
              Set the expected tax the city should collect from a specific
              woreda + category combination in fiscal year{' '}
              <span className="font-medium text-foreground">{summary?.fiscalYear}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Woreda *</Label>
              <Select
                value={woredaTargetWoredaId}
                onValueChange={(v) => setWoredaTargetWoredaId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select woreda..." />
                </SelectTrigger>
                <SelectContent>
                  {summary?.byWoreda.map((w) => (
                    <SelectItem key={w.woredaId} value={w.woredaId}>
                      Woreda {w.woredaCode} — {w.woredaName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select
                value={woredaTargetCat}
                onValueChange={(v) => setWoredaTargetCat(v)}
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
            <div className="space-y-1.5">
              <Label>Expected Amount (ETB) *</Label>
              <Input
                type="number"
                min="0"
                step="1000"
                value={woredaTargetAmount}
                onChange={(e) => setWoredaTargetAmount(e.target.value)}
                placeholder="e.g. 800,000"
              />
              <p className="text-xs text-muted-foreground">
                This is in addition to (or instead of) the city-wide target. Per-woreda targets are summed to compute the city-wide expected.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWoredaDialogOpen(false)}
              disabled={woredaTargetSaving}
            >
              Cancel
            </Button>
            <Button onClick={saveWoredaTarget} disabled={woredaTargetSaving}>
              {woredaTargetSaving ? 'Saving…' : 'Save Per-Woreda Target'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
