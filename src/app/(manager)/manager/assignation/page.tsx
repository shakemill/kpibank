'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Users, Settings, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

type Periode = { id: number; code: string; type: string; statut: string }

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

const SECTION_LABELS: Record<keyof Omit<Grouped, 'rattachesDirects'> | 'rattachesDirects', string> = {
  rattachesDirects: 'Rattachés directs',
  directeurs: 'Directeurs',
  chefsService: 'Chefs de service',
  managers: 'Managers',
  employes: 'Employés',
}

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const

type SortKey = 'sectionLabel' | 'nom' | 'role' | 'nbKpiAssignes' | 'sommePoids' | 'statutGlobal'

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  EMPLOYE: { label: 'Employé', className: 'bg-muted text-muted-foreground' },
  MANAGER: { label: 'Manager', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  CHEF_SERVICE: { label: 'Chef de service', className: 'bg-violet-500/10 text-violet-700 dark:text-violet-400' },
  DIRECTEUR: { label: 'Directeur', className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  DG: { label: 'DG', className: 'bg-red-500/10 text-red-700 dark:text-red-400' },
}

const STATUT_GLOBAL_LABEL: Record<string, string> = {
  OK: 'Tous validés',
  CONTESTATIONS: 'Contestations en cours',
  EN_ATTENTE: 'En attente acceptation',
  INCOMPLET: 'Incomplet',
}

function PoidsIndicator({ row }: { row: CollaborateurRow }) {
  if (row.nbKpiAssignes === 0) {
    return <span className="text-red-600 font-medium">0% 🔴</span>
  }
  if (row.poidsOk) {
    return <span className="text-green-600 font-medium">{row.sommePoids.toFixed(1)}% ✅</span>
  }
  return <span className="text-orange-600">{row.sommePoids.toFixed(1)}% ⚠️</span>
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

function AssignationTable({
  rows,
  router,
  sortBy,
  sortDir,
  onSort,
}: {
  rows: CollaborateurRowWithSection[]
  router: ReturnType<typeof useRouter>
  sortBy: SortKey | null
  sortDir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
}) {
  if (rows.length === 0) return null
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead label="Groupe" sortKey="sectionLabel" currentSort={sortBy} sortDir={sortDir} onSort={onSort} />
          <SortableHead label="Nom" sortKey="nom" currentSort={sortBy} sortDir={sortDir} onSort={onSort} />
          <SortableHead label="Rôle" sortKey="role" currentSort={sortBy} sortDir={sortDir} onSort={onSort} />
          <SortableHead
            label="Nb KPI"
            sortKey="nbKpiAssignes"
            currentSort={sortBy}
            sortDir={sortDir}
            onSort={onSort}
            className="text-right"
          />
          <SortableHead
            label="Poids"
            sortKey="sommePoids"
            currentSort={sortBy}
            sortDir={sortDir}
            onSort={onSort}
            className="text-right"
          />
          <SortableHead
            label="Statut global"
            sortKey="statutGlobal"
            currentSort={sortBy}
            sortDir={sortDir}
            onSort={onSort}
          />
          <TableHead className="w-[140px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const roleBadge = ROLE_BADGE[row.role] ?? { label: row.role, className: 'bg-muted text-muted-foreground' }
          return (
            <TableRow key={`${row.sectionLabel}-${row.id}`}>
              <TableCell className="text-muted-foreground text-sm">{row.sectionLabel}</TableCell>
              <TableCell>
                <div className="font-medium">{row.prenom} {row.nom}</div>
                {(row.service ?? row.direction) && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {[row.direction?.nom, row.service?.nom].filter(Boolean).join(' · ')}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={roleBadge.className}>
                  {roleBadge.label}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{row.nbKpiAssignes}</TableCell>
              <TableCell className="text-right">
                <PoidsIndicator row={row} />
              </TableCell>
              <TableCell>{STATUT_GLOBAL_LABEL[row.statutGlobal] ?? row.statutGlobal}</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/manager/assignation/${row.id}`)}
                >
                  <Settings className="h-3.5 w-3.5 mr-1" />
                  Gérer ses KPI
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export default function AssignationPage() {
  const router = useRouter()
  const [periodes, setPeriodes] = useState<Periode[]>([])
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [grouped, setGrouped] = useState<Grouped | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statutFilter, setStatutFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [sortBy, setSortBy] = useState<SortKey | null>('nom')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

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
    setPage(1)
  }, [search, roleFilter, statutFilter, pageSize])

  const selectedPeriode = periodes.find((p) => p.id === periodeId)
  const allRows: CollaborateurRowWithSection[] = grouped ? flattenGrouped(grouped) : []
  const searchLower = search.trim().toLowerCase()
  const filteredRows = allRows.filter((r) => {
    if (searchLower && ![r.nom, r.prenom, r.email].some((s) => String(s ?? '').toLowerCase().includes(searchLower)))
      return false
    if (roleFilter !== 'all' && r.role !== roleFilter) return false
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
        case 'sommePoids':
          cmp = a.sommePoids - b.sommePoids
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
  const totalCollaborateurs = allRows.length

  return (
    <div className="space-y-6 p-6">
      {/* Sélecteur de période en haut */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignation des KPI</h1>
          <p className="text-muted-foreground mt-1">
            Gérer les KPI assignés aux membres de votre périmètre pour la période sélectionnée.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Période :</span>
          <Select
            value={periodeId != null ? String(periodeId) : 'none'}
            onValueChange={(v) => (v !== 'none' ? setPeriodeId(parseInt(v, 10)) : setPeriodeId(null))}
            disabled={loading || periodes.length === 0}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sélectionner une période" />
            </SelectTrigger>
            <SelectContent>
              {periodes.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.code} {p.statut === 'EN_COURS' ? '(en cours)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedPeriode && (
        <p className="text-sm text-muted-foreground">
          Période active : <strong>{selectedPeriode.code}</strong>
        </p>
      )}

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Collaborateurs assignables</CardTitle>
              <CardDescription>
                {totalCollaborateurs} personne{totalCollaborateurs !== 1 ? 's' : ''} dans votre périmètre
                {totalFiltered !== totalCollaborateurs ? ` — ${totalFiltered} après filtres` : ''}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : periodeId == null ? (
            <p className="text-muted-foreground">Sélectionnez une période.</p>
          ) : loadingData ? (
            <p className="text-muted-foreground">Chargement des assignations...</p>
          ) : grouped ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher (nom, prénom, email)..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    {Object.entries(ROLE_BADGE).map(([value, { label }]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statutFilter} onValueChange={setStatutFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    {Object.entries(STATUT_GLOBAL_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Par page</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => setPageSize(Number(v) as 10 | 25 | 50)}
                  >
                    <SelectTrigger className="w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <AssignationTable
                rows={paginatedRows}
                router={router}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={handleSort}
              />

              {totalFiltered === 0 && (
                <p className="text-muted-foreground py-4">
                  {totalCollaborateurs === 0
                    ? 'Aucun collaborateur dans votre périmètre.'
                    : 'Aucun résultat pour ces filtres.'}
                </p>
              )}

              {totalFiltered > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} sur {totalPages}
                    {' — '}
                    {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalFiltered)} sur {totalFiltered}
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage > 1) setPage((p) => p - 1)
                          }}
                          className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                          aria-disabled={currentPage <= 1}
                        />
                      </PaginationItem>
                      {(() => {
                        const show = Array.from(
                          new Set([
                            1,
                            totalPages,
                            currentPage,
                            currentPage - 1,
                            currentPage + 1,
                          ].filter((p) => p >= 1 && p <= totalPages))
                        ).sort((a, b) => a - b)
                        return show.map((p, idx, arr) => (
                          <PaginationItem key={p}>
                            {idx > 0 && arr[idx - 1] !== p - 1 && (
                              <span className="px-2 text-muted-foreground">…</span>
                            )}
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                setPage(p)
                              }}
                              isActive={p === currentPage}
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        ))
                      })()}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage < totalPages) setPage((p) => p + 1)
                          }}
                          className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                          aria-disabled={currentPage >= totalPages}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground py-4">Aucune donnée.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => router.push('/manager/assignation/contestations')}>
          Voir les contestations
        </Button>
      </div>
    </div>
  )
}
