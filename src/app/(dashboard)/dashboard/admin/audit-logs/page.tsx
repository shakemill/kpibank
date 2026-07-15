'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format, startOfMonth, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'
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
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
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
import {
  ArrowLeft,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Trash2,
  FileText,
  Search,
  X,
  Shield,
} from 'lucide-react'
import { TableSkeleton } from '@/components/table-skeleton'
import { AUDIT_ACTION_LABELS, libellerActionAudit } from '@/lib/audit-actions'
import { cn } from '@/lib/utils'

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

const ACTION_OPTIONS = Object.entries(AUDIT_ACTION_LABELS)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label, 'fr'))

function toInputDate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function parseInputDate(s: string): Date | undefined {
  if (!s) return undefined
  const d = new Date(s + 'T12:00:00')
  return Number.isNaN(d.getTime()) ? undefined : d
}

function formatDateShort(s: string) {
  const d = parseInputDate(s)
  if (!d) return s
  return format(d, 'd MMM yyyy', { locale: fr })
}

function actionTone(action: string): string {
  if (
    action.startsWith('AUTH_') ||
    action === 'PASSWORD_CHANGE' ||
    action.includes('DELETE') ||
    action.includes('REJECT')
  ) {
    return 'border-red-200/80 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'
  }
  if (
    action.includes('CREATE') ||
    action.includes('VALIDATE') ||
    action.includes('ACCEPT') ||
    action.includes('ACTIVATE')
  ) {
    return 'border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
  }
  if (action.startsWith('KPI_') || action.startsWith('SAISIE_')) {
    return 'border-sky-200/80 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300'
  }
  return 'border-border bg-muted/60 text-foreground'
}

export default function AuditLogsPage() {
  const [list, setList] = useState<AuditLogRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [purging, setPurging] = useState(false)
  const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [filterSearch, setFilterSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [dateOpen, setDateOpen] = useState(false)

  const dateRange: DateRange | undefined = useMemo(() => {
    const from = parseInputDate(filterFrom)
    const to = parseInputDate(filterTo)
    if (!from && !to) return undefined
    return { from, to }
  }, [filterFrom, filterTo])

  const dateLabel = useMemo(() => {
    if (filterFrom && filterTo) {
      return `${formatDateShort(filterFrom)} → ${formatDateShort(filterTo)}`
    }
    if (filterFrom) return `À partir du ${formatDateShort(filterFrom)}`
    if (filterTo) return `Jusqu’au ${formatDateShort(filterTo)}`
    return 'Période'
  }, [filterFrom, filterTo])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('pageSize', String(PAGE_SIZE))
    if (filterFrom) params.set('from', filterFrom)
    if (filterTo) params.set('to', filterTo)
    if (filterAction !== 'all') params.set('action', filterAction)
    if (filterSearch.trim()) params.set('search', filterSearch.trim())
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
  }, [page, filterFrom, filterTo, filterAction, filterSearch])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    const t = setTimeout(() => {
      setFilterSearch(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = Boolean(filterFrom || filterTo || filterAction !== 'all' || filterSearch.trim())

  const rangeLabel = useMemo(() => {
    if (total === 0) return '0 résultat'
    const from = (page - 1) * PAGE_SIZE + 1
    const to = Math.min(page * PAGE_SIZE, total)
    return `${from}–${to} sur ${total}`
  }, [page, total])

  const applyPreset = (preset: '7d' | '30d' | 'month' | 'clear') => {
    const today = new Date()
    if (preset === 'clear') {
      setFilterFrom('')
      setFilterTo('')
    } else if (preset === '7d') {
      setFilterFrom(toInputDate(subDays(today, 6)))
      setFilterTo(toInputDate(today))
    } else if (preset === '30d') {
      setFilterFrom(toInputDate(subDays(today, 29)))
      setFilterTo(toInputDate(today))
    } else {
      setFilterFrom(toInputDate(startOfMonth(today)))
      setFilterTo(toInputDate(today))
    }
    setPage(1)
  }

  const resetFilters = () => {
    setSearchInput('')
    setFilterSearch('')
    setFilterAction('all')
    setFilterFrom('')
    setFilterTo('')
    setPage(1)
  }

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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 min-w-0">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-0.5" asChild>
            <Link href="/dashboard/admin">
              <ArrowLeft className="h-4 w-4" />
              Retour à l&apos;administration
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Audit & Logs</h1>
              <p className="text-sm text-muted-foreground">
                Traçabilité des actions sensibles — rétention 12 mois
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
          <Badge variant="secondary" className="tabular-nums h-8 px-3 text-sm font-semibold">
            {total} entrée{total !== 1 ? 's' : ''}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            disabled={purging}
            onClick={() => setPurgeConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Purger
          </Button>
        </div>
      </div>

      <Card className="border-border/60 overflow-hidden shadow-none">
        <CardHeader className="gap-4 border-b border-border/50 bg-gradient-to-b from-muted/40 to-muted/10 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Journal d&apos;audit</CardTitle>
              <CardDescription className="mt-1">{rangeLabel}</CardDescription>
            </div>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 h-8 text-muted-foreground"
                onClick={resetFilters}
              >
                <X className="h-3.5 w-3.5" />
                Réinitialiser
              </Button>
            )}
          </div>

          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
            <div className="relative min-w-[180px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Utilisateur, e-mail, détail…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9 bg-background shadow-none"
              />
            </div>

            <Select
              value={filterAction}
              onValueChange={(v) => {
                setFilterAction(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[200px] shrink-0 h-9 bg-background">
                <SelectValue placeholder="Toutes les actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'h-9 w-[240px] shrink-0 justify-start gap-2 font-normal bg-background',
                    !filterFrom && !filterTo && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-left">{dateLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="flex flex-col sm:flex-row">
                  <div className="flex sm:flex-col gap-1 border-b sm:border-b-0 sm:border-r border-border/60 p-3 bg-muted/20">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium px-2 mb-1 hidden sm:block">
                      Raccourcis
                    </p>
                    {(
                      [
                        { id: '7d', label: '7 derniers jours' },
                        { id: '30d', label: '30 derniers jours' },
                        { id: 'month', label: 'Ce mois' },
                        { id: 'clear', label: 'Toute la période' },
                      ] as const
                    ).map((p) => (
                      <Button
                        key={p.id}
                        variant="ghost"
                        size="sm"
                        className="justify-start h-8 text-xs font-normal"
                        onClick={() => {
                          applyPreset(p.id)
                          if (p.id !== 'clear') setDateOpen(false)
                        }}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                  <div className="p-2">
                    <Calendar
                      mode="range"
                      numberOfMonths={1}
                      selected={dateRange}
                      onSelect={(range) => {
                        setFilterFrom(range?.from ? toInputDate(range.from) : '')
                        setFilterTo(range?.to ? toInputDate(range.to) : '')
                        setPage(1)
                        if (range?.from && range?.to) setDateOpen(false)
                      }}
                      locale={fr}
                      defaultMonth={dateRange?.from ?? new Date()}
                      disabled={{ after: new Date() }}
                    />
                    <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1 border-t border-border/50">
                      <p className="text-xs text-muted-foreground truncate">
                        {filterFrom || filterTo ? dateLabel : 'Choisissez une plage'}
                      </p>
                      {(filterFrom || filterTo) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => applyPreset('clear')}
                        >
                          Effacer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={10} cols={6} />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-1">Aucun log</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                {hasFilters
                  ? 'Aucune entrée ne correspond aux filtres sélectionnés.'
                  : 'Les actions sensibles (connexion, organisation, KPI, validations) apparaîtront ici.'}
              </p>
              {hasFilters && (
                <Button variant="outline" size="sm" className="mt-4" onClick={resetFilters}>
                  Effacer les filtres
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="hidden md:table-cell">Entité</TableHead>
                      <TableHead>Détails</TableHead>
                      <TableHead className="hidden sm:table-cell text-right">IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((log, idx) => (
                      <TableRow key={log.id} className={cn(idx % 2 === 1 && 'bg-muted/15')}>
                        <TableCell className="align-top whitespace-nowrap py-3">
                          <div className="leading-tight">
                            <p className="text-sm font-medium tabular-nums">
                              {format(new Date(log.createdAt), 'd MMM yyyy', { locale: fr })}
                            </p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {format(new Date(log.createdAt), 'HH:mm:ss')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="align-top py-3 min-w-0 max-w-[200px]">
                          {log.user ? (
                            <div className="min-w-0">
                              <p className="text-sm font-medium leading-snug truncate">
                                {log.user.prenom} {log.user.nom}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{log.user.email}</p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Système</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top py-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              'font-medium text-[11px] whitespace-normal text-left h-auto py-0.5 px-2',
                              actionTone(log.action)
                            )}
                          >
                            {libellerActionAudit(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top py-3 hidden md:table-cell">
                          {log.entityType ? (
                            <div className="text-sm leading-tight">
                              <span className="font-medium">{log.entityType}</span>
                              {log.entityId && (
                                <span className="text-muted-foreground tabular-nums">
                                  {' '}
                                  #{log.entityId}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top py-3 max-w-[280px]">
                          <p
                            className="text-sm text-muted-foreground truncate"
                            title={log.details ?? undefined}
                          >
                            {log.details ?? '—'}
                          </p>
                        </TableCell>
                        <TableCell className="align-top py-3 hidden sm:table-cell text-right">
                          <span className="text-xs font-mono text-muted-foreground">
                            {log.ip ?? '—'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border/50 bg-muted/10">
                <p className="text-sm text-muted-foreground">{rangeLabel}</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="gap-1 h-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <Badge variant="secondary" className="tabular-nums font-medium px-2.5">
                    {page} / {totalPages}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="gap-1 h-8"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
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
