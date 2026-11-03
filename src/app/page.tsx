'use client'

import { useState } from 'react'
import { RoleProvider, useRole } from '@/components/tax-system/role-context'
import { Header } from '@/components/tax-system/header'
import { Dashboard } from '@/components/tax-system/dashboard'
import { TaxPayers } from '@/components/tax-system/taxpayers'
import { Assignments } from '@/components/tax-system/assignments'
import { ProcessTracker } from '@/components/tax-system/process-tracker'
import { ROLES } from '@/components/tax-system/lib'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  GitBranch,
  Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type Tab = 'dashboard' | 'taxpayers' | 'assignments' | 'tracker'

const TABS: Array<{
  key: Tab
  label: string
  icon: typeof LayoutDashboard
}> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'taxpayers', label: 'Tax Payers', icon: Users },
  { key: 'assignments', label: 'Assignments', icon: ClipboardList },
  { key: 'tracker', label: 'Process Tracker', icon: GitBranch },
]

function Main() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const { role } = useRole()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <RoleBanner role={role} />

      {/* Tabs */}
      <nav className="sticky top-[57px] z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="mx-auto max-w-7xl px-2 sm:px-6 flex overflow-x-auto">
          {TABS.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <t.icon className="h-4 w-4" />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-6">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'taxpayers' && <TaxPayers />}
        {tab === 'assignments' && <Assignments />}
        {tab === 'tracker' && <ProcessTracker />}
      </main>

      <footer className="mt-auto border-t bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            Bishoftu Finance · Tax Collection Process Control System
          </p>
          <p>
            Workflow:{' '}
            <span className="font-medium text-foreground">
              Registry → Team 1 Assign → Tax Payer Pays at Bank → Team 2 Bank Receipt → Team 2 Government Receipt
            </span>
          </p>
        </div>
      </footer>
    </div>
  )
}

function RoleBanner({ role }: { role: keyof typeof ROLES }) {
  return (
    <div className="bg-primary/5 border-b border-primary/10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2 flex items-center gap-2 text-xs">
        <Info className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        <span className="text-muted-foreground">
          <Badge variant="secondary" className="mr-1 text-[10px]">
            Mode
          </Badge>
          <span className="font-medium text-foreground">{ROLES[role].label}</span>
          <span className="mx-1">—</span>
          {ROLES[role].description}
        </span>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <RoleProvider>
      <Main />
    </RoleProvider>
  )
}
