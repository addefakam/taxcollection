'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, AlertCircle, Clock, TrendingUp, CheckCircle2, Info } from 'lucide-react'

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  priority: string
  readAt: string | null
  createdAt: string
  relatedType?: string | null
  relatedId?: string | null
}

const PRIORITY_TONE: Record<string, string> = {
  LOW: 'text-muted-foreground',
  MEDIUM: 'text-sky-600',
  HIGH: 'text-amber-600',
  CRITICAL: 'text-rose-600',
}

const TYPE_ICON: Record<string, typeof Bell> = {
  DEADLINE_WARNING: Clock,
  OVERDUE: AlertCircle,
  LOW_PERFORMANCE: TrendingUp,
  PLAN_INCOMPLETE: AlertCircle,
  PLAN_OVERDUE: AlertCircle,
  TARGET_ASSIGNED: Info,
  TARGET_ACHIEVED: CheckCircle2,
  ASSIGNMENT_CREATED: Info,
  BANK_RECEIPT_RECEIVED: CheckCircle2,
  GOVT_RECEIPT_ISSUED: CheckCircle2,
  GENERAL: Bell,
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      const d = await res.json()
      setNotifications(d.notifications || [])
      setUnreadCount(d.unreadCount || 0)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000) // refresh every minute
    return () => clearInterval(interval)
  }, [load])

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      // ignore
    }
  }

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.readAt)
    for (const n of unread) {
      await markAsRead(n.id)
    }
  }

  const recent = notifications.slice(0, 10)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <DropdownMenuItem className="text-xs text-muted-foreground">
            Loading…
          </DropdownMenuItem>
        ) : recent.length === 0 ? (
          <DropdownMenuItem className="text-xs text-muted-foreground">
            No notifications.
          </DropdownMenuItem>
        ) : (
          recent.map(n => {
            const Icon = TYPE_ICON[n.type] || Bell
            const isUnread = !n.readAt
            return (
              <DropdownMenuItem
                key={n.id}
                className={`flex items-start gap-2 py-2 cursor-pointer ${isUnread ? 'bg-primary/5' : ''}`}
                onClick={() => isUnread && markAsRead(n.id)}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${PRIORITY_TONE[n.priority] || ''}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs ${isUnread ? 'font-medium' : 'text-muted-foreground'}`}>
                    {n.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                    {n.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                {isUnread && (
                  <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                )}
              </DropdownMenuItem>
            )
          })
        )}
        {notifications.length > 10 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-center text-primary">
              {notifications.length} total notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
