'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type NotificationItem = {
  id: number
  type: string
  titre: string
  message: string
  lu: boolean
  lien: string | null
  createdAt: string
}

const TYPE_LABELS: Record<string, string> = {
  RAPPEL_SAISIE: 'Rappel saisie',
  SAISIE_EN_RETARD: 'Saisie en retard',
  SAISIE_SOUMISE: 'Saisie soumise',
  VALIDATION_REQUISE: 'Validation requise',
  KPI_NOTIFIE: 'KPI notifié',
  KPI_CONTESTE: 'Contestation KPI',
  KPI_MAINTENU: 'Contestation maintenue',
  KPI_REVISE: 'Contestation révisée',
  PERIODE_CLOTUREE: 'Période clôturée',
}

function getNotificationColor(type: string): string {
  switch (type) {
    case 'SAISIE_EN_RETARD':
    case 'KPI_CONTESTE':
      return 'text-orange-500'
    case 'VALIDATION_REQUISE':
    case 'KPI_MAINTENU':
    case 'KPI_REVISE':
      return 'text-green-500'
    case 'RAPPEL_SAISIE':
      return 'text-blue-500'
    default:
      return 'text-muted-foreground'
  }
}

export function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchList = useCallback(async () => {
    const res = await fetch('/api/notifications?limit=10')
    if (!res.ok) return
    const data = await res.json()
    setNotifications(data.list ?? [])
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    const res = await fetch('/api/notifications?limit=1&lu=false')
    if (!res.ok) return
    const data = await res.json()
    setUnreadCount(data.total ?? 0)
  }, [])

  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  useEffect(() => {
    if (open) {
      setLoading(true)
      fetchList()
        .then(() => fetchUnreadCount())
        .finally(() => setLoading(false))
    }
  }, [open, fetchList, fetchUnreadCount])

  const markAsRead = useCallback(
    async (id: number, lien: string | null) => {
      const res = await fetch(`/api/notifications/${id}/lire`, { method: 'PUT' })
      if (!res.ok) return
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lu: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
      setOpen(false)
      if (lien) router.push(lien)
    },
    [router]
  )

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">{unreadCount} non lues</span>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Chargement…
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Aucune notification</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 border-b hover:bg-accent/50 transition-colors text-left',
                  !notification.lu && 'bg-accent/20'
                )}
                onClick={() => markAsRead(notification.id, notification.lien)}
              >
                <span
                  className={cn(
                    'shrink-0 mt-0.5 h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium',
                    getNotificationColor(notification.type)
                  )}
                >
                  {!notification.lu && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium leading-none">{notification.titre}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABELS[notification.type] ?? notification.type} ·{' '}
                    {new Date(notification.createdAt).toLocaleString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: 'short',
                    })}
                  </p>
                </div>
                {!notification.lu && (
                  <Check className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            ))
          )}
        </ScrollArea>
        <div className="border-t p-2">
          <Link href="/notifications" onClick={() => setOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full">
              Voir tout
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
