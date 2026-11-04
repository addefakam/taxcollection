'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from './header'
import { Dashboard } from './dashboard'
import { TaxPayers } from './taxpayers'
import { Assignments } from './assignments'
import { ProcessTracker } from './process-tracker'
import { StaffManagement } from './staff-management'
import { RevenueDashboard } from './revenue-dashboard'
import { TaxTargets } from './tax-targets'
import { RoleProvider } from './role-context'
import { ROLES, Role } from './lib'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  GitBranch,
  UserCog,
  Info,
  TrendingUp,
  Target,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface SessionUser {
  id: string
  fullName: string
  email: string
  role: Role
}

type Tab =
  | 'dashboard'
  | 'taxpayers'
  | 'assignments'
  | 'tracker'
  | 'revenue'
  | 'targets'
  | 'staff'

const TABS: Array<{
  key: Tab
  label: string
  icon: typeof LayoutDashboard
  visibleTo?: Role[] // if undefined, visible to all
}> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'taxpayers', label: 'Tax Payers', icon: Users },
  { key: 'assignments', label: 'Assignments', icon: ClipboardList },
  { key: 'tracker', label: 'Process Tracker', icon: GitBranch },
  {
    key: 'revenue',
    label: 'City Revenue',
    icon: TrendingUp,
    visibleTo: ['LEADER', 'CITY_REVENUE_OFFICER'],
  },
  {
    key: 'targets',
    label: 'Tax Targets',
    icon: Target,
    visibleTo: ['LEADER', 'CITY_REVENUE_OFFICER'],
  },
  {
    key: 'staff',
    label: 'Staff Management',
    icon: UserCog,
    visibleTo: ['LEADER'],
  },
]

export function AppShell({ user }: { user: SessionUser }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('dashboard')

  const visibleTabs = TABS.filter((t) => !t.visibleTo || t.visibleTo.includes(user.role))
  // Safety: if the user somehow has a tab selected they're not allowed to see, fall back to dashboard
  const selectedTab = visibleTabs.find((t) => t.key === tab)
  const safeTab: Tab = selectedTab ? tab : 'dashboard'

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <RoleProvider user={user}>
      <div className="min-h-screen flex flex-col bg-background">
        <Header user={user} onLogout={logout} />

        <RoleBanner role={user.role} />

        {/* Tabs */}
        <nav className="sticky top-[57px] z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="mx-auto max-w-7xl px-2 sm:px-6 flex overflow-x-auto">
            {visibleTabs.map((t) => {
              const active = safeTab === t.key
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
          {safeTab === 'dashboard' && <Dashboard />}
          {safeTab === 'taxpayers' && <TaxPayers />}
          {safeTab === 'assignments' && <Assignments />}
          {safeTab === 'tracker' && <ProcessTracker />}
          {safeTab === 'revenue' && selectedTab && <RevenueDashboard />}
          {safeTab === 'targets' && selectedTab && <TaxTargets />}
          {safeTab === 'staff' && selectedTab && (
            <StaffManagement currentUser={user} />
          )}
        </main>

        <footer className="mt-auto border-t bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>Bishoftu Finance · Tax Collection Process Control System</p>
            <p>
              Workflow:{' '}
              <span className="font-medium text-foreground">
                Registry → Team 1 Assign → Tax Payer Pays at Bank → Team 2 Bank Receipt → Team 2 Government Receipt
              </span>
            </p>
          </div>
        </footer>
      </div>
    </RoleProvider>
  )
}

function RoleBanner({ role }: { role: Role }) {
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
