'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  Shield,
  Save,
  RotateCcw,
  Lock,
  Check,
  X,
  AlertCircle,
} from 'lucide-react'

interface ActionDef {
  key: string
  label: string
  description: string
  category: string
}

interface RoleDef {
  role: string
  label: string
}

interface PermissionsData {
  actions: ActionDef[]
  roles: RoleDef[]
  matrix: Record<string, Record<string, boolean>>
  canManage: boolean
}

// Track local changes before saving
type ChangeKey = string // `${role}:${action}`
const changeKey = (role: string, action: string) => `${role}:${action}`

export function PermissionsManagement() {
  const { toast } = useToast()
  const [data, setData] = useState<PermissionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [changes, setChanges] = useState<Map<ChangeKey, boolean>>(new Map())
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/permissions')
      const d = await r.json()
      setData(d)
      setChanges(new Map())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Get the current effective value for a cell (DB value + local change)
  const getValue = (role: string, action: string): boolean => {
    const key = changeKey(role, action)
    if (changes.has(key)) return changes.get(key)!
    return data?.matrix?.[role]?.[action] ?? false
  }

  const toggle = (role: string, action: string) => {
    const key = changeKey(role, action)
    const current = getValue(role, action)
    const newMap = new Map(changes)
    newMap.set(key, !current)
    setChanges(newMap)
  }

  const resetChanges = () => {
    setChanges(new Map())
  }

  const save = async () => {
    if (changes.size === 0) return
    setSaving(true)
    try {
      const changeArray = Array.from(changes.entries()).map(([key, allowed]) => {
        const [role, action] = key.split(':')
        return { role, action, allowed }
      })
      const r = await fetch('/api/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: changeArray }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to save')
      toast({
        title: 'Permissions saved',
        description: `Updated ${changes.size} permission(s). Changes take effect immediately.`,
      })
      await load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Group actions by category
  const categories = data
    ? Array.from(new Set(data.actions.map((a) => a.category)))
    : []

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground">Failed to load permissions.</p>
        </CardContent>
      </Card>
    )
  }

  if (!data.canManage) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Lock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">Access Denied</p>
          <p className="text-xs text-muted-foreground mt-1">
            Only the System Admin can manage permissions.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Permission Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Control what each role can do. Toggle the checkboxes below and click Save.
            Changes take effect immediately for all users.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {changes.size > 0 && (
            <Button variant="outline" onClick={resetChanges} disabled={saving} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Reset ({changes.size})
            </Button>
          )}
          <Button onClick={save} disabled={changes.size === 0 || saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : `Save ${changes.size > 0 ? `(${changes.size})` : ''}`}
          </Button>
        </div>
      </div>

      {/* Warning */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <CardContent className="p-3 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            Removing permissions from your own role may lock you out. The System Admin role
            always has full access and cannot be restricted.
          </span>
        </CardContent>
      </Card>

      {/* Permission matrix */}
      {categories.map((cat) => {
        const catActions = data.actions.filter((a) => a.category === cat)
        return (
          <Card key={cat}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">{cat}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium sticky left-0 bg-muted/40 min-w-[200px]">
                      Action
                    </th>
                    {data.roles.map((r) => (
                      <th key={r.role} className="px-3 py-2 text-center font-medium min-w-[100px]">
                        {r.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {catActions.map((action) => (
                    <tr key={action.key} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-sm">{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </td>
                      {data.roles.map((r) => {
                        const val = getValue(r.role, action.key)
                        const isSystemAdmin = r.role === 'SYSTEM_ADMIN'
                        const isManagePerms = action.key === 'MANAGE_PERMISSIONS'
                        const isLocked = isSystemAdmin && isManagePerms // can't remove MANAGE_PERMISSIONS from SYSTEM_ADMIN
                        const hasChange = changes.has(changeKey(r.role, action.key))
                        return (
                          <td key={r.role} className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => !isLocked && toggle(r.role, action.key)}
                              disabled={isLocked}
                              className={`inline-flex items-center justify-center h-7 w-7 rounded-md border-2 transition-all ${
                                val
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'bg-background border-border hover:border-muted-foreground'
                              } ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
                                hasChange ? 'ring-2 ring-primary ring-offset-1' : ''
                              }`}
                              title={
                                isLocked
                                  ? 'Cannot remove this permission from System Admin'
                                  : val
                                    ? 'Allowed — click to revoke'
                                    : 'Not allowed — click to grant'
                              }
                            >
                              {val ? <Check className="h-4 w-4" /> : <X className="h-3 w-3 opacity-30" />}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )
      })}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500 text-white">
            <Check className="h-3 w-3" />
          </span>
          Allowed
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border-2 border-border">
            <X className="h-3 w-3 opacity-30" />
          </span>
          Not allowed
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border-2 border-primary ring-2 ring-primary ring-offset-1" />
          Has unsaved change
        </span>
        <span className="flex items-center gap-1">
          <Lock className="h-3 w-3" />
          Locked (System Admin)
        </span>
      </div>
    </div>
  )
}
