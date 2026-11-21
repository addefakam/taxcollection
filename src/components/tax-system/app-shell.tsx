'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from './header'
import { Dashboard } from './dashboard'
import { TaxPayers } from './taxpayers'
import { Assignments } from './assignments'
import { ProcessTracker } from './process-tracker'
import { StaffManagement } from './staff-management'
import { SubCitiesManagement } from './sub-cities-management'
import { TeamsManagement } from './teams-management'
import { PlansManagement } from './plans-management'
import { ReportsManagement } from './reports-management'
import { RevenueDashboard } from './revenue-dashboard'
import { TaxTargets } from './tax-targets'
import { PermissionsManagement } from './permissions-management'
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
  Shield,
  Layers,
  CalendarDays,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
  | 'woredas'
  | 'teams'
  | 'plans'
  | 'reports'
  | 'permissions'

const TABS: Array<{
  key: Tab
  label: string
  icon: typeof LayoutDashboard
  visibleTo?: Role[]
}> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'taxpayers', label: 'Tax Payers', icon: Users },
  { key: 'assignments', label: 'Assignments', icon: ClipboardList },
  { key: 'tracker', label: 'Process Tracker', icon: GitBranch },
  {
    key: 'revenue',
    label: 'City Revenue',
    icon: TrendingUp,
    visibleTo: ['LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN', 'CITY_REVENUE_OFFICER', 'SUBCITY_ADMIN', 'WOREDA_ADMIN'],
  },
  {
    key: 'targets',
    label: 'Tax Targets',
    icon: Target,
    visibleTo: ['LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN', 'CITY_REVENUE_OFFICER', 'SUBCITY_ADMIN', 'WOREDA_ADMIN'],
  },
  {
    key: 'staff',
    label: 'Staff Management',
    icon: UserCog,
    visibleTo: ['LEADER', 'SYSTEM_ADMIN'],
  },
  {
    key: 'woredas',
    label: 'Sub-Cities',
    icon: Layers,
    visibleTo: ['LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN', 'SUBCITY_ADMIN'],
  },
  {
    key: 'teams',
    label: 'Teams',
    icon: Users,
    visibleTo: ['LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN', 'SUBCITY_ADMIN', 'WOREDA_ADMIN'],
  },
  {
    key: 'plans',
    label: 'Plans',
    icon: CalendarDays,
    visibleTo: ['LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN', 'SUBCITY_ADMIN', 'WOREDA_ADMIN', 'TEAM_LEAD'],
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: FileText,
    visibleTo: ['LEADER', 'SYSTEM_ADMIN', 'CITY_ADMIN', 'SUBCITY_ADMIN', 'WOREDA_ADMIN', 'CITY_REVENUE_OFFICER'],
  },
  {
    key: 'permissions',
    label: 'Permissions',
    icon: Shield,
    visibleTo: ['SYSTEM_ADMIN'],
  },
]

export function AppShell({ user }: { user: SessionUser }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const visibleTabs = TABS.filter((t) => !t.visibleTo || t.visibleTo.includes(user.role))
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

        {/* Main layout: sidebar + content */}
        <div className="flex flex-1 min-h-0">
          {/* Vertical sidebar */}
          <aside
            className={`${
              sidebarOpen ? 'w-60' : 'w-16'
            } flex-shrink-0 border-r bg-card transition-all duration-200 sticky top-[100px] self-start`}
            style={{ height: 'calc(100vh - 100px)' }}
          >
            {/* Collapse toggle */}
            <div className="flex items-center justify-end p-2 border-b">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Vertical menu items */}
            <nav className="flex flex-col p-2 gap-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
              {visibleTabs.map((t) => {
                const active = safeTab === t.key
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    title={t.label}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    } ${sidebarOpen ? '' : 'justify-center'}`}
                  >
                    <t.icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && <span className="truncate">{t.label}</span>}
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* Main content area */}
          <main className="flex-1 min-w-0 overflow-x-auto px-4 sm:px-6 py-6">
            <div className="mx-auto max-w-7xl">
              {safeTab === 'dashboard' && <Dashboard />}
              {safeTab === 'taxpayers' && <TaxPayers />}
              {safeTab === 'assignments' && <Assignments />}
              {safeTab === 'tracker' && <ProcessTracker />}
              {safeTab === 'revenue' && selectedTab && <RevenueDashboard />}
              {safeTab === 'targets' && selectedTab && <TaxTargets />}
              {safeTab === 'staff' && selectedTab && (
                <StaffManagement currentUser={user} />
              )}
              {safeTab === 'woredas' && selectedTab && <SubCitiesManagement />}
              {safeTab === 'teams' && selectedTab && <TeamsManagement />}
              {safeTab === 'plans' && selectedTab && <PlansManagement />}
              {safeTab === 'reports' && selectedTab && <ReportsManagement />}
              {safeTab === 'permissions' && selectedTab && <PermissionsManagement />}
            </div>
          </main>
        </div>

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
