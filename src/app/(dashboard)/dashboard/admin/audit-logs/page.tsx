'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Lock, ChevronLeft, ChevronRight, Trash2, FileText } from 'lucide-react'
import { TableSkeleton } from '@/components/table-skeleton'

type AuditLogRow = {
  id: number
  createdAt: string
  userId: number | null
  action: string
  entityType: string | null
  entityId: string | null
  details: string | null
  ip: string | null
  user: { id: number; nom: string; prenom: string; email: string } | null
}

const PAGE_SIZE = 25

export default function AuditLogsPage() {
  const [list, setList] = useState<AuditLogRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [purging, setPurging] = useState(false)
  const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', String(PAGE_SIZE))
    if (filterFrom) params.set('from', filterFrom)
    if (filterTo) params.set('to', filterTo)
    const res = await fetch(`/api/audit-logs?${params.toString()}`)
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? res.statusText, variant: 'destructive' })
      return
    }
    const data = await res.json()
    setList(data.list ?? [])
    setTotal(data.total ?? 0)
  }, [page, filterFrom, filterTo])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handlePurge = async () => {
    setPurgeConfirmOpen(false)
    setPurging(true)
    try {
      const res = await fetch('/api/audit-logs/purge', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec purge', variant: 'destructive' })
        return
      }
      toast({ title: 'Purge effectuée', description: `${data.deleted ?? 0} entrée(s) supprimée(s).` })
      fetchLogs()
    } finally {
      setPurging(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="w-fit gap-2 -ml-2" asChild>
          <Link href="/dashboard/admin" title="Retour à l'administration">
            <ArrowLeft className="h-4 w-4" />
            Retour à l&apos;administration
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shrink-0">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit & Logs</h1>
            <p className="text-muted-foreground mt-0.5">
              Historique des actions et logs système. Les entrées de plus d&apos;un an sont purgées.
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Journal d&apos;audit</CardTitle>
              <CardDescription>
                {total} entrée{total !== 1 ? 's' : ''}
                {(filterFrom || filterTo) && ' (filtrées)'}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="date"
                placeholder="Du"
                value={filterFrom}
                onChange={(e) => {
                  setFilterFrom(e.target.value)
                  setPage(1)
                }}
                className="w-[140px] h-9"
              />
              <Input
                type="date"
                placeholder="Au"
                value={filterTo}
                onChange={(e) => {
                  setFilterTo(e.target.value)
                  setPage(1)
                }}
                className="w-[140px] h-9"
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2 h-9 text-destructive hover:text-destructive"
                disabled={purging}
                onClick={() => setPurgeConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Purger &gt; 1 an
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={10} cols={6} />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">Aucun log</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Aucune entrée d&apos;audit pour la période sélectionnée. Les actions importantes seront enregistrées ici.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entité</TableHead>
                      <TableHead>Détails</TableHead>
                      <TableHead className="text-right">IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {format(new Date(log.createdAt), 'd MMM yyyy HH:mm', { locale: fr })}
                        </TableCell>
                        <TableCell>
                          {log.user
                            ? `${log.user.prenom} ${log.user.nom}`
                            : '—'}
                        </TableCell>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell>
                          {log.entityType && log.entityId
                            ? `${log.entityType} #${log.entityId}`
                            : log.entityType ?? '—'}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate" title={log.details ?? undefined}>
                          {log.details ?? '—'}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">
                          {log.ip ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Page {page} sur {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="gap-1"
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={purgeConfirmOpen} onOpenChange={setPurgeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Purger les logs de plus d&apos;un an</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les entrées d&apos;audit antérieures à un an seront définitivement supprimées. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurge}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Purger
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
