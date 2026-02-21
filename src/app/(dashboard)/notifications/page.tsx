'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Check, CheckCheck } from 'lucide-react'

type NotificationItem = {
  id: number
  type: string
  titre: string
  message: string
  lu: boolean
  lien: string | null
  createdAt: string
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'Tous les types' },
  { value: 'RAPPEL_SAISIE', label: 'Rappel saisie' },
  { value: 'SAISIE_EN_RETARD', label: 'Saisie en retard' },
  { value: 'SAISIE_SOUMISE', label: 'Saisie soumise' },
  { value: 'VALIDATION_REQUISE', label: 'Validation requise' },
  { value: 'KPI_NOTIFIE', label: 'KPI notifié' },
  { value: 'KPI_CONTESTE', label: 'Contestation KPI' },
  { value: 'KPI_MAINTENU', label: 'Contestation maintenue' },
  { value: 'KPI_REVISE', label: 'Contestation révisée' },
  { value: 'PERIODE_CLOTUREE', label: 'Période clôturée' },
]

const PAGE_SIZE = 20

export default function NotificationsPage() {
  const router = useRouter()
  const [list, setList] = useState<NotificationItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [filterLu, setFilterLu] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(page * PAGE_SIZE))
    if (filterLu === 'true') params.set('lu', 'true')
    else if (filterLu === 'false') params.set('lu', 'false')
    if (filterType && filterType !== 'all') params.set('type', filterType)
    const res = await fetch(`/api/notifications?${params.toString()}`)
    setLoading(false)
    if (!res.ok) return
    const data = await res.json()
    setList(data.list ?? [])
    setTotal(data.total ?? 0)
  }, [page, filterLu, filterType])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = useCallback(
    async (id: number, lien: string | null) => {
      const res = await fetch(`/api/notifications/${id}/lire`, { method: 'PUT' })
      if (!res.ok) return
      setList((prev) => prev.map((n) => (n.id === id ? { ...n, lu: true } : n)))
      setTotal((t) => Math.max(0, t - (list.find((n) => n.id === id)?.lu ? 0 : 1)))
      if (lien) router.push(lien)
    },
    [list, router]
  )

  const markAllAsRead = useCallback(async () => {
    const res = await fetch('/api/notifications/tout-lire', { method: 'PUT' })
    if (!res.ok) return
    setList((prev) => prev.map((n) => ({ ...n, lu: true })))
    fetchNotifications()
  }, [fetchNotifications])

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">
          Consultez et gérez vos notifications.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Liste des notifications</CardTitle>
          <CardDescription>Filtrez par type et statut lu / non lu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Select value={filterLu} onValueChange={setFilterLu}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="false">Non lues</SelectItem>
                <SelectItem value="true">Lues</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2">
              <CheckCheck className="h-4 w-4" />
              Tout marquer comme lu
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8">Chargement…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8">Aucune notification.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statut</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((n) => (
                    <TableRow key={n.id} className={!n.lu ? 'bg-accent/20' : ''}>
                      <TableCell>{n.lu ? 'Lu' : 'Non lu'}</TableCell>
                      <TableCell>
                        {TYPE_OPTIONS.find((o) => o.value === n.type)?.label ?? n.type}
                      </TableCell>
                      <TableCell className="font-medium">{n.titre}</TableCell>
                      <TableCell className="max-w-[300px] truncate">{n.message}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(n.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        {!n.lu && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => markAsRead(n.id, n.lien)}
                          >
                            <Check className="h-3 w-3" />
                            Marquer lu
                          </Button>
                        )}
                        {n.lu && n.lien && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(n.lien!)}
                          >
                            Voir
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {total} notification{total !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
