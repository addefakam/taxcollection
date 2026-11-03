'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Building2,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  ClipboardList,
  Landmark,
  CheckCircle2,
  Users,
  Workflow,
  KeyRound,
  AlertCircle,
  FileText,
  ArrowRight,
  TrendingUp,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Wand2,
} from 'lucide-react'

// Demo / seed credentials — these match scripts/seed.ts.
// Shown on the login page so first-time users can quickly try the system.
// IMPORTANT: in production, change all of these after first login (User menu → Change password).
interface DemoAccount {
  role: string
  roleLabel: string
  fullName: string
  email: string
  password: string
  tone: string
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'LEADER',
    roleLabel: 'Finance Leader',
    fullName: 'Ato Tesfaye Lemma',
    email: 'leader@bishoftu.gov.et',
    password: 'Bishoftu@2026',
    tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  {
    role: 'CITY_REVENUE_OFFICER',
    roleLabel: 'City Revenue Officer',
    fullName: 'Ato Habtamu Girma',
    email: 'revenue@bishoftu.gov.et',
    password: 'Revenue@habtamu',
    tone: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  },
  {
    role: 'TEAM_1_ASSIGNMENT',
    roleLabel: 'Team 1 — Assignment',
    fullName: 'W/ro Almaz Bekele',
    email: 'almaz.bekele@bishoftu.gov.et',
    password: 'Team1@almaz',
    tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  {
    role: 'TEAM_1_ASSIGNMENT',
    roleLabel: 'Team 1 — Assignment',
    fullName: 'Ato Dawit Girma',
    email: 'dawit.girma@bishoftu.gov.et',
    password: 'Team1@dawit',
    tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  {
    role: 'TEAM_2_FINANCE',
    roleLabel: 'Team 2 — Finance Office',
    fullName: 'W/ro Sara Mengistu',
    email: 'sara.mengistu@bishoftu.gov.et',
    password: 'Team2@sara',
    tone: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  },
  {
    role: 'TEAM_2_FINANCE',
    roleLabel: 'Team 2 — Finance Office',
    fullName: 'Ato Yonas Tadesse',
    email: 'yonas.tadesse@bishoftu.gov.et',
    password: 'Team2@yonas',
    tone: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreds, setShowCreds] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  const fillCredentials = (acc: DemoAccount) => {
    setEmail(acc.email)
    setPassword(acc.password)
    setError(null)
    setShowPassword(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }
      // Redirect to home
      router.replace('/')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-background to-emerald-50/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 lg:py-10">
        {/* Top brand bar */}
        <header className="flex items-center justify-between gap-4 mb-8 lg:mb-12">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="leading-tight">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                Bishoftu Finance Office
              </h1>
              <p className="text-xs text-muted-foreground">
                Tax Collection Process Control System
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Secured · Oromia Region · Ethiopia</span>
          </div>
        </header>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* LEFT: long informational panel */}
          <section className="space-y-6 order-2 lg:order-1">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
                <Workflow className="h-3.5 w-3.5" />
                End-to-end tax collection control
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                Track every tax payment, from assignment to government receipt.
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-3 leading-relaxed">
                The Bishoftu Finance Office uses this system to follow each tax collection
                case through every step of the workflow. Every taxpayer, every assignment,
                every bank receipt, and every government receipt issued is recorded —
                so leadership has full visibility of the collection process at any moment.
              </p>
            </div>

            {/* Workflow steps */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  The workflow you control
                </CardTitle>
                <CardDescription>
                  Each tax collection case moves through these five stages:
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ol className="space-y-3">
                  <WorkflowStep
                    step={1}
                    icon={Users}
                    title="Tax Payer Registry"
                    desc="All taxpayers in the city — businesses, individuals, property owners, vehicle owners — are registered with TIN, contact, woreda and trade license details."
                    tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  />
                  <WorkflowStep
                    step={2}
                    icon={ClipboardList}
                    title="Team 1 assigns"
                    desc="Team 1 selects a taxpayer and creates an assignment: tax type, fiscal year, period, amount due and due date. Status becomes ‘Assigned — Awaiting Payment’."
                    tone="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  />
                  <WorkflowStep
                    step={3}
                    icon={Landmark}
                    title="Tax payer pays at bank"
                    desc="The taxpayer pays at any Ethiopian bank (CBE, Dashen, Awash, Abyssinia, Wegagen, Hibret, etc.) and returns to the Finance Office with the bank receipt."
                    tone="bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                  />
                  <WorkflowStep
                    step={4}
                    icon={FileText}
                    title="Team 2 records bank receipt"
                    desc="Team 2 records the bank name, receipt number, payment date and amount. Scanned bank receipt images/PDFs can be attached. Status becomes ‘Bank Receipt Submitted’."
                    tone="bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                  />
                  <WorkflowStep
                    step={5}
                    icon={CheckCircle2}
                    title="Team 2 issues government receipt"
                    desc="Team 2 issues the official government receipt number (GR-2026-XXXX). The case is now ‘Completed’ and the taxpayer has full confirmation of payment."
                    tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  />
                </ol>
              </CardContent>
            </Card>

            {/* Roles */}
            <div className="grid sm:grid-cols-2 gap-3">
              <RoleCard
                icon={ShieldCheck}
                title="Finance Leader"
                desc="Full visibility. Adds staff, blocks taxpayers, cancels assignments, resolves disputes."
                tone="border-emerald-300 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20"
                iconTone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              />
              <RoleCard
                icon={TrendingUp}
                title="City Revenue Officer"
                desc="Follows up city-wide income: expected vs collected by category, daily/weekly/monthly/yearly trends."
                tone="border-violet-300 bg-violet-50/40 dark:border-violet-800 dark:bg-violet-950/20"
                iconTone="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
              />
              <RoleCard
                icon={Users}
                title="Team 1 — Assignment"
                desc="Manages the taxpayer registry and creates tax assignments."
                tone="border-amber-300 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20"
                iconTone="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              />
              <RoleCard
                icon={Landmark}
                title="Team 2 — Finance"
                desc="Receives bank receipts and issues government receipts to taxpayers."
                tone="border-sky-300 bg-sky-50/40 dark:border-sky-800 dark:bg-sky-950/20"
                iconTone="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
              />
            </div>

            {/* Security note */}
            <Card className="border-emerald-200/60 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <CardContent className="p-4 flex gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 space-y-1">
                  <p className="font-medium">
                    Your session is protected
                  </p>
                  <p className="text-emerald-700/90 dark:text-emerald-300/80 leading-relaxed">
                    Passwords are stored as bcrypt hashes. Sessions are signed JWTs in
                    httpOnly cookies (8-hour expiry). Every API route checks your role
                    server-side — even technical users cannot bypass permission rules.
                    All actions are recorded in the audit timeline with your name and timestamp.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Help / forgot password */}
            <Card className="border-border/60">
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <KeyRound className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Forgot your password?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ask the Finance Leader to reset it from{' '}
                      <span className="font-medium">Staff Management → Reset Password</span>.
                      A temporary password will be generated for you.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">First time logging in?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Use the credentials provided by your Finance Leader. You can change
                      your password anytime from the user menu in the top-right corner
                      after signing in.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Need an account?</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Only the Finance Leader can create new staff accounts. Contact the
                      Bishoftu Finance Office directly if you believe you should have access.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center lg:text-left pt-2">
              © {new Date().getFullYear()} Bishoftu City Finance Office · Oromia Region,
              Ethiopia · Internal use only.
            </p>
          </section>

          {/* RIGHT: login form */}
          <section className="order-1 lg:order-2 lg:sticky lg:top-10">
            <Card className="shadow-xl border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Sign in
                </CardTitle>
                <CardDescription>
                  Enter your staff email and password to access the system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@bishoftu.gov.et"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9"
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-muted text-muted-foreground"
                        title={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </Button>
                </form>

                {/* Demo credentials panel */}
                <div className="mt-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowCreds((v) => !v)}
                    className="w-full flex items-center justify-between text-left text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5" />
                      Demo credentials (click to fill)
                    </span>
                    {showCreds ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {showCreds && (
                    <div className="mt-3 space-y-2">
                      <div className="rounded-md border border-amber-300/60 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/30 p-2 text-xs text-amber-800 dark:text-amber-200 flex gap-2">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <span>
                          These passwords come from <code className="font-mono">scripts/seed.ts</code>.
                          Change them after first login (User menu → Change password).
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {DEMO_ACCOUNTS.map((acc) => {
                          const isActive = email === acc.email
                          return (
                            <li
                              key={acc.email}
                              className={`rounded-md border p-2 transition-colors ${
                                isActive
                                  ? 'border-primary bg-primary/5'
                                  : 'border-border/60 hover:bg-muted/50'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span
                                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ${acc.tone}`}
                                    >
                                      {acc.roleLabel}
                                    </span>
                                    <span className="text-xs font-medium truncate">
                                      {acc.fullName}
                                    </span>
                                  </div>
                                  <div className="flex flex-col gap-0.5 text-[11px] font-mono text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {acc.email}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Lock className="h-3 w-3" />
                                      {acc.password}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isActive ? 'default' : 'outline'}
                                  className="gap-1.5 h-7 text-xs flex-shrink-0"
                                  onClick={() => fillCredentials(acc)}
                                >
                                  <Wand2 className="h-3 w-3" />
                                  {isActive ? 'Filled' : 'Use'}
                                </Button>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium text-foreground">Need help?</span> Contact
                    the Finance Office IT desk.
                  </p>
                </div>
              </CardContent>
            </Card>

            <p className="text-center text-xs text-muted-foreground mt-4">
              By signing in you agree that all actions are logged with your name and timestamp.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

function WorkflowStep({
  step,
  icon: Icon,
  title,
  desc,
  tone,
}: {
  step: number
  icon: typeof Building2
  title: string
  desc: string
  tone: string
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full ${tone} text-xs font-bold flex-shrink-0`}
        >
          {step}
        </div>
        {step < 5 && <div className="w-px flex-1 bg-border mt-1" />}
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <p className="font-medium text-sm">{title}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
      </div>
    </li>
  )
}

function RoleCard({
  icon: Icon,
  title,
  desc,
  tone,
  iconTone,
}: {
  icon: typeof Building2
  title: string
  desc: string
  tone: string
  iconTone: string
}) {
  return (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-md mb-2 ${iconTone}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
    </div>
  )
}
