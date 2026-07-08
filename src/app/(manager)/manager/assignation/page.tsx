'use client'

import { useState, useEffect, useCallback, useMemo, type ComponentType } from 'react'
import { libellerRole } from '@/lib/role-labels'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'
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
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Users,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Briefcase,
  Target,
  Send,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronRight,
  X,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { libellerPorteeKpi } from '@/lib/portee-kpi-labels'
import { cn } from '@/lib/utils'

type Periode = { id: number; code: string; type: string; statut: string }
type ServiceOption = { id: number; nom: string; code: string; kpiActifs?: number }

type CollaborateurRow = {
  id: number
  nom: string
  prenom: string
  email: string
  role: string
  serviceId: number | null
  directionId: number | null
  service: { id: number; nom: string; code: string } | null
  direction: { id: number; nom: string; code: string } | null
  manager: { id: number; nom: string; prenom: string } | null
  nbKpiAssignes: number
  sommePoids: number
  poidsOk: boolean
  statutGlobal: string
}

type Grouped = {
  rattachesDirects: CollaborateurRow[]
  directeurs: CollaborateurRow[]
  chefsService: CollaborateurRow[]
  managers: CollaborateurRow[]
  employes: CollaborateurRow[]
}

type CollaborateurRowWithSection = CollaborateurRow & { sectionLabel: string }

const SECTION_LABELS: Record<keyof Grouped, string> = {
  rattachesDirects: 'Rattachés directs',
  directeurs: 'Directeurs',
  chefsService: 'Chefs de service',
  managers: 'Managers',
  employes: 'Employés',
}

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const

type SortKey = 'sectionLabel' | 'nom' | 'role' | 'nbKpiAssignes' | 'statutGlobal'

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  EMPLOYE: { label: 'Employé', className: 'bg-muted text-muted-foreground' },
  MANAGER: { label: 'Manager', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  CHEF_SERVICE: { label: libellerRole('CHEF_SERVICE'), className: 'bg-violet-500/10 text-violet-700 dark:text-violet-400' },
  DIRECTEUR: { label: 'Directeur', className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  DG: { label: 'DG', className: 'bg-red-500/10 text-red-700 dark:text-red-400' },
}

const STATUT_GLOBAL_LABEL: Record<string, string> = {
  OK: 'Complet',
  CONTESTATIONS: 'Contestations',
  EN_ATTENTE: 'En attente',
  INCOMPLET: 'Incomplet',
}

const STATUT_BADGE: Record<string, string> = {
  OK: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900',
  CONTESTATIONS: 'bg-destructive/10 text-destructive border-destructive/20',
  EN_ATTENTE: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',
  INCOMPLET: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900',
}

function flattenGrouped(grouped: Grouped): CollaborateurRowWithSection[] {
  const out: CollaborateurRowWithSection[] = []
  const keys: (keyof Grouped)[] = ['rattachesDirects', 'directeurs', 'chefsService', 'managers', 'employes']
  for (const key of keys) {
    const label = SECTION_LABELS[key]
    for (const row of grouped[key]) {
      out.push({ ...row, sectionLabel: label })
    }
  }
  return out
}

function SortableHead({
  label,
  sortKey,
  currentSort,
  sortDir,
  onSort,
  className,
}: {
  label: string
  sortKey: SortKey
  currentSort: SortKey | null
  sortDir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
  className?: string
}) {
  const active = currentSort === sortKey
  return (
    <TableHead
      className={cn('cursor-pointer select-none hover:bg-muted/50 transition-colors', className)}
      onClick={() => onSort(sortKey)}
    >
      <div className={cn('flex items-center gap-1', className?.includes('text-right') && 'justify-end')}>
        {label}
        {active ? (
          sortDir === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
        )}
      </div>
    </TableHead>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  onClick,
}: {
  label: string
  value: number
  icon: ComponentType<{ className?: string }>
  tone?: 'default' | 'success' | 'warning' | 'danger'
  onClick?: () => void
}) {
  const tones = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-destructive/10 text-destructive',
  }
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-card p-4 text-left transition-colors',
        onClick && 'hover:bg-muted/50 cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', tones[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Wrapper>
  )
}

export default function AssignationPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role ?? ''
  const canManageServiceKpis = role === 'DIRECTEUR' || role === 'DG'
  const [periodes, setPeriodes] = useState<Periode[]>([])
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [grouped, setGrouped] = useState<Grouped | null>(null)
  const [services, setServices] = useState<ServiceOption[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [statutFilter, setStatutFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [sortBy, setSortBy] = useState<SortKey | null>('nom')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [activeTab, setActiveTab] = useState('individuels')

  const handleSort = useCallback((key: SortKey) => {
    setSortBy((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return key
      }
      setSortDir('asc')
      return key
    })
  }, [])

  const fetchPeriodes = useCallback(async () => {
    const res = await fetch('/api/periodes')
    if (!res.ok) return
    const data = await res.json()
    const enCoursOuAVenir = (data ?? []).filter(
      (p: Periode) => p.statut === 'EN_COURS' || p.statut === 'A_VENIR'
    )
    setPeriodes(enCoursOuAVenir)
    if (enCoursOuAVenir.length > 0) {
      const enCours = enCoursOuAVenir.find((p: Periode) => p.statut === 'EN_COURS')
      setPeriodeId((prev) => prev ?? (enCours ? enCours.id : enCoursOuAVenir[0].id))
    }
  }, [])

  const fetchAssignation = useCallback(async () => {
    if (periodeId == null) return
    setLoadingData(true)
    const res = await fetch(`/api/kpi/employe/a-assigner?periodeId=${periodeId}`)
    setLoadingData(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? 'Chargement', variant: 'destructive' })
      setGrouped(null)
      return
    }
    const data = await res.json()
    setGrouped(data.grouped ?? null)
  }, [periodeId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPeriodes().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [fetchPeriodes])

  useEffect(() => {
    if (periodeId != null) fetchAssignation()
    else setGrouped(null)
  }, [periodeId, fetchAssignation])

  useEffect(() => {
    if (!canManageServiceKpis || periodeId == null) {
      setServices([])
      return
    }
    let cancelled = false
    async function loadServices() {
      const url =
        role === 'DG'
          ? '/api/organisation/services?actif=true'
          : `/api/directeur/services?periodeId=${periodeId}`
      const res = await fetch(url)
      if (cancelled || !res.ok) return
      const data = await res.json()
      const list = role === 'DG' ? data : data.services
      setServices(
        (list ?? []).map((s: { id: number; nom: string; code: string; kpiActifs?: number }) => ({
          id: s.id,
          nom: s.nom,
          code: s.code,
          kpiActifs: s.kpiActifs,
        }))
      )
    }
    loadServices()
    return () => { cancelled = true }
  }, [canManageServiceKpis, periodeId, role])

  useEffect(() => {
    setPage(1)
  }, [search, roleFilter, statutFilter, serviceFilter, pageSize])

  const allRows: CollaborateurRowWithSection[] = grouped ? flattenGrouped(grouped) : []

  const serviceOptions = useMemo(() => {
    if (services.length > 0) return services
    const map = new Map<number, ServiceOption>()
    for (const r of allRows) {
      if (r.service) {
        map.set(r.service.id, { id: r.service.id, nom: r.service.nom, code: r.service.code })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }, [services, allRows])

  const stats = useMemo(() => ({
    total: allRows.length,
    ok: allRows.filter((r) => r.statutGlobal === 'OK').length,
    incomplet: allRows.filter((r) => r.statutGlobal === 'INCOMPLET' || r.nbKpiAssignes === 0).length,
    contestations: allRows.filter((r) => r.statutGlobal === 'CONTESTATIONS').length,
    enAttente: allRows.filter((r) => r.statutGlobal === 'EN_ATTENTE').length,
  }), [allRows])

  const searchLower = search.trim().toLowerCase()
  const filteredRows = allRows.filter((r) => {
    if (searchLower && ![r.nom, r.prenom, r.email].some((s) => String(s ?? '').toLowerCase().includes(searchLower)))
      return false
    if (roleFilter !== 'all' && r.role !== roleFilter) return false
    if (serviceFilter !== 'all') {
      const sid = parseInt(serviceFilter, 10)
      if (Number.isNaN(sid) || r.serviceId !== sid) return false
    }
    if (statutFilter !== 'all' && r.statutGlobal !== statutFilter) return false
    return true
  })

  const sortedRows = useMemo(() => {
    if (!sortBy) return filteredRows
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filteredRows].sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'sectionLabel':
          cmp = (a.sectionLabel ?? '').localeCompare(b.sectionLabel ?? '')
          break
        case 'nom':
          cmp = `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`)
          break
        case 'role':
          cmp = (a.role ?? '').localeCompare(b.role ?? '')
          break
        case 'nbKpiAssignes':
          cmp = a.nbKpiAssignes - b.nbKpiAssignes
          break
        case 'statutGlobal':
          cmp = (a.statutGlobal ?? '').localeCompare(b.statutGlobal ?? '')
          break
        default:
          return 0
      }
      return cmp * dir
    })
  }, [filteredRows, sortBy, sortDir])

  const totalFiltered = sortedRows.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const paginatedRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const hasActiveFilters =
    search.trim() !== '' || roleFilter !== 'all' || serviceFilter !== 'all' || statutFilter !== 'all'

  const resetFilters = () => {
    setSearch('')
    setRoleFilter('all')
    setServiceFilter('all')
    setStatutFilter('all')
  }

  const goToUser = (userId: number) => router.push(`/manager/assignation/${userId}`)

  const selectedPeriode = periodes.find((p) => p.id === periodeId)

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
            <Send className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assignation des KPI</h1>
            <p className="text-muted-foreground text-sm mt-0.5 max-w-xl">
              {canManageServiceKpis
                ? 'Définissez les KPI de départements et assignez les KPI individuels à votre équipe.'
                : 'Assignez et suivez les KPI individuels de votre périmètre.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select
              value={periodeId != null ? String(periodeId) : 'none'}
              onValueChange={(v) => (v !== 'none' ? setPeriodeId(parseInt(v, 10)) : setPeriodeId(null))}
              disabled={loading || periodes.length === 0}
            >
              <SelectTrigger className="w-[180px] border-0 bg-transparent shadow-none h-8 focus:ring-0">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                {periodes.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.code} {p.statut === 'EN_COURS' ? '· en cours' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href="/manager/assignation/contestations">
              <AlertCircle className="h-4 w-4" />
              Contestations
              {stats.contestations > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {stats.contestations}
                </Badge>
              )}
            </Link>
          </Button>
        </div>
      </div>

      {/* Synthèse */}
      {!loading && grouped && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard label="Collaborateurs" value={stats.total} icon={Users} />
          <StatCard
            label="Complets (100 %)"
            value={stats.ok}
            icon={CheckCircle2}
            tone="success"
            onClick={() => setStatutFilter('OK')}
          />
          <StatCard
            label="Incomplets"
            value={stats.incomplet}
            icon={AlertCircle}
            tone="warning"
            onClick={() => setStatutFilter('INCOMPLET')}
          />
          <StatCard
            label="En attente"
            value={stats.enAttente}
            icon={Clock}
            tone="default"
            onClick={() => setStatutFilter('EN_ATTENTE')}
          />
        </div>
      )}

      {/* Contenu principal */}
      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Chargement…
          </CardContent>
        </Card>
      ) : periodeId == null ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Sélectionnez une période pour commencer.
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {canManageServiceKpis && services.length > 0 && (
            <TabsList className="mb-4">
              <TabsTrigger value="individuels" className="gap-2">
                <User className="h-4 w-4" />
                KPI individuels
                <Badge variant="secondary" className="ml-1">{stats.total}</Badge>
              </TabsTrigger>
              <TabsTrigger value="departements" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Départements / agences
                <Badge variant="secondary" className="ml-1">{services.length}</Badge>
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="individuels" className="mt-0 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Collaborateurs</CardTitle>
                    <CardDescription>
                      {selectedPeriode && <>Période {selectedPeriode.code} · </>}
                      {totalFiltered} résultat{totalFiltered !== 1 ? 's' : ''}
                      {hasActiveFilters && ` (sur ${stats.total})`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Barre de filtres */}
                <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher par nom, prénom ou email…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 bg-background"
                      />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-[160px] bg-background">
                        <SelectValue placeholder="Rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les rôles</SelectItem>
                        {Object.entries(ROLE_BADGE).map(([value, { label }]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {serviceOptions.length > 0 && (
                      <Select value={serviceFilter} onValueChange={setServiceFilter}>
                        <SelectTrigger className="w-[180px] bg-background">
                          <SelectValue placeholder="Département" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les départements</SelectItem>
                          {serviceOptions.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>{s.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Select value={statutFilter} onValueChange={setStatutFilter}>
                      <SelectTrigger className="w-[160px] bg-background">
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        {Object.entries(STATUT_GLOBAL_LABEL).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-muted-foreground">
                        <X className="h-3.5 w-3.5" />
                        Réinitialiser
                      </Button>
                    )}
                  </div>
                  {/* Raccourcis statut */}
                  <div className="flex flex-wrap gap-1.5">
                    {(['INCOMPLET', 'EN_ATTENTE', 'CONTESTATIONS', 'OK'] as const).map((s) => (
                      <Button
                        key={s}
                        variant={statutFilter === s ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setStatutFilter(statutFilter === s ? 'all' : s)}
                      >
                        {STATUT_GLOBAL_LABEL[s]}
                      </Button>
                    ))}
                  </div>
                </div>

                {loadingData ? (
                  <div className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Chargement des assignations…
                  </div>
                ) : grouped ? (
                  <>
                    {paginatedRows.length > 0 ? (
                      <div className="rounded-md border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <SortableHead label="Collaborateur" sortKey="nom" currentSort={sortBy} sortDir={sortDir} onSort={handleSort} />
                              <SortableHead label="Groupe" sortKey="sectionLabel" currentSort={sortBy} sortDir={sortDir} onSort={handleSort} />
                              <SortableHead label="Rôle" sortKey="role" currentSort={sortBy} sortDir={sortDir} onSort={handleSort} />
                              <SortableHead label="KPI" sortKey="nbKpiAssignes" currentSort={sortBy} sortDir={sortDir} onSort={handleSort} className="text-right w-[70px]" />
                              <SortableHead label="Statut" sortKey="statutGlobal" currentSort={sortBy} sortDir={sortDir} onSort={handleSort} className="w-[130px]" />
                              <TableHead className="w-[40px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedRows.map((row) => {
                              const roleBadge = ROLE_BADGE[row.role] ?? { label: row.role, className: 'bg-muted text-muted-foreground' }
                              return (
                                <TableRow
                                  key={row.id}
                                  className="cursor-pointer group"
                                  onClick={() => goToUser(row.id)}
                                >
                                  <TableCell>
                                    <div className="font-medium">{row.prenom} {row.nom}</div>
                                    <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                                      {row.email}
                                    </div>
                                    {(row.service ?? row.direction) && (
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        {[row.service?.nom, row.direction?.nom].filter(Boolean).join(' · ')}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-xs text-muted-foreground">{row.sectionLabel}</span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className={cn('text-xs', roleBadge.className)}>
                                      {roleBadge.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">{row.nbKpiAssignes}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={cn('text-xs font-normal', STATUT_BADGE[row.statutGlobal] ?? '')}
                                    >
                                      {STATUT_GLOBAL_LABEL[row.statutGlobal] ?? row.statutGlobal}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-muted-foreground">
                        {stats.total === 0
                          ? 'Aucun collaborateur dans votre périmètre.'
                          : 'Aucun résultat pour ces filtres.'}
                        {hasActiveFilters && stats.total > 0 && (
                          <div className="mt-2">
                            <Button variant="link" size="sm" onClick={resetFilters}>
                              Réinitialiser les filtres
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {totalFiltered > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>
                            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalFiltered)} sur {totalFiltered}
                          </span>
                          <Select
                            value={String(pageSize)}
                            onValueChange={(v) => setPageSize(Number(v) as 10 | 25 | 50)}
                          >
                            <SelectTrigger className="w-[70px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAGE_SIZE_OPTIONS.map((n) => (
                                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span>par page</span>
                        </div>
                        {totalPages > 1 && (
                          <Pagination>
                            <PaginationContent>
                              <PaginationItem>
                                <PaginationPrevious
                                  href="#"
                                  onClick={(e) => { e.preventDefault(); if (currentPage > 1) setPage((p) => p - 1) }}
                                  className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                                />
                              </PaginationItem>
                              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                let p: number
                                if (totalPages <= 5) p = i + 1
                                else if (currentPage <= 3) p = i + 1
                                else if (currentPage >= totalPages - 2) p = totalPages - 4 + i
                                else p = currentPage - 2 + i
                                return (
                                  <PaginationItem key={p}>
                                    <PaginationLink
                                      href="#"
                                      isActive={p === currentPage}
                                      onClick={(e) => { e.preventDefault(); setPage(p) }}
                                    >
                                      {p}
                                    </PaginationLink>
                                  </PaginationItem>
                                )
                              })}
                              <PaginationItem>
                                <PaginationNext
                                  href="#"
                                  onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) setPage((p) => p + 1) }}
                                  className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground py-8 text-center">Aucune donnée.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {canManageServiceKpis && services.length > 0 && (
            <TabsContent value="departements" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">KPI {libellerPorteeKpi('SERVICE')}</CardTitle>
                      <CardDescription>
                        Objectifs collectifs par département — le score est calculé automatiquement à partir des KPI individuels.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {services.map((svc) => (
                      <Link
                        key={svc.id}
                        href={`/chef-service/kpi-service?serviceId=${svc.id}`}
                        className="group rounded-xl border p-4 hover:bg-muted/40 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{svc.nom}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{svc.code}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Target className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {svc.kpiActifs != null ? (
                              <><strong className="text-foreground">{svc.kpiActifs}</strong> KPI actif{svc.kpiActifs !== 1 ? 's' : ''}</>
                            ) : (
                              'Configurer les KPI'
                            )}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  )
}
