'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
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
import { ArrowLeft, Target, Users, Loader2, Search } from 'lucide-react'
import { libellerRole } from '@/lib/role-labels'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const

type EmployeRow = {
  id: number
  nom: string
  prenom: string
  email: string
  role: string
  directionNom: string | null
  serviceNom: string | null
  kpiTotalAssignes: number
}

type ApiResponse = {
  periodeId: number
  periodeCode: string
  perimetreLabel?: string
  viewerRole?: string
  employes: EmployeRow[]
}

export default function CollaborateursSansKpiPage() {
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const periodeIdParam = searchParams.get('periodeId')
  const [periodeId, setPeriodeId] = useState<number | null>(
    periodeIdParam ? parseInt(periodeIdParam, 10) : null
  )
  const [periodes, setPeriodes] = useState<{ id: number; code: string }[]>([])
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [directionFilter, setDirectionFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const viewerRole =
    (session?.user as { role?: string } | undefined)?.role ?? data?.viewerRole ?? 'MANAGER'
  const showRole = viewerRole === 'DIRECTEUR' || viewerRole === 'DG'

  const sansKpiAll = useMemo(
    () => (data?.employes ?? []).filter((e) => e.kpiTotalAssignes === 0),
    [data]
  )

  const directions = useMemo(() => {
    const set = new Set<string>()
    for (const e of sansKpiAll) {
      set.add(e.directionNom ?? 'Sans direction')
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [sansKpiAll])

  const sansKpi = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    return sansKpiAll.filter((e) => {
      if (directionFilter !== 'all' && (e.directionNom ?? 'Sans direction') !== directionFilter) {
        return false
      }
      if (!q) return true
      const nom = e.nom.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
      const prenom = e.prenom.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
      const full = `${prenom} ${nom}`
      return nom.includes(q) || prenom.includes(q) || full.includes(q)
    })
  }, [sansKpiAll, directionFilter, searchQuery])

  useEffect(() => {
    setPage(1)
  }, [directionFilter, searchQuery, pageSize, periodeId])

  useEffect(() => {
    if (directionFilter !== 'all' && !directions.includes(directionFilter)) {
      setDirectionFilter('all')
    }
  }, [directions, directionFilter])

  const totalFiltered = sansKpi.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const paginatedRows = sansKpi.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const fetchPeriodes = useCallback(async () => {
    const res = await fetch('/api/periodes')
    if (!res.ok) return
    const list = await res.json()
    setPeriodes(list)
    if (periodeId == null && list.length > 0) {
      const enCours = list.find((p: { statut: string }) => p.statut === 'EN_COURS')
      setPeriodeId(enCours ? enCours.id : list[0].id)
    }
  }, [periodeId])

  const fetchEquipe = useCallback(async () => {
    const url =
      periodeId != null ? `/api/manager/equipe?periodeId=${periodeId}` : '/api/manager/equipe'
    const res = await fetch(url)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err?.error ?? 'Chargement')
      setData(null)
      return
    }
    setData(await res.json())
  }, [periodeId])

  useEffect(() => {
    fetchPeriodes()
  }, [fetchPeriodes])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchEquipe().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [fetchEquipe])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 min-w-0">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-0.5" asChild>
            <Link href={periodeId != null ? `/manager/equipe?periodeId=${periodeId}` : '/manager/equipe'}>
              <ArrowLeft className="h-4 w-4" />
              Retour à Mon équipe
            </Link>
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
            Collaborateurs sans KPI
          </h1>
          <p className="text-muted-foreground text-sm">
            {data?.perimetreLabel ?? 'Votre périmètre'}
            {data?.periodeCode ? ` — ${data.periodeCode}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={periodeId?.toString() ?? ''}
            onValueChange={(v) => setPeriodeId(v ? parseInt(v, 10) : null)}
            disabled={loading}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              {periodes.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild className="gap-2">
            <Link href="/manager/assignation">
              <Target className="h-4 w-4" />
              Définir les KPI
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base">
                {loading
                  ? 'Chargement…'
                  : `${sansKpi.length} collaborateur${sansKpi.length !== 1 ? 's' : ''}`}
              </CardTitle>
              <CardDescription className="mt-1">
                Aucun KPI sur la période — assignez des objectifs depuis chaque ligne.
              </CardDescription>
            </div>
            {!loading && (
              <Badge variant="secondary" className="tabular-nums font-semibold shrink-0">
                {sansKpi.length}
              </Badge>
            )}
          </div>
          {!loading && (
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nom ou prénom…"
                  className="pl-8 h-9"
                />
              </div>
              {directions.length > 1 && (
                <Select value={directionFilter} onValueChange={setDirectionFilter}>
                  <SelectTrigger className="w-full sm:w-[220px] shrink-0">
                    <SelectValue placeholder="Direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les directions</SelectItem>
                    {directions.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Chargement…
            </div>
          ) : sansKpiAll.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Tous les collaborateurs ont au moins un KPI sur cette période.
            </p>
          ) : sansKpi.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {searchQuery.trim()
                ? 'Aucun collaborateur ne correspond à cette recherche.'
                : 'Aucun collaborateur sans KPI dans cette direction.'}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="min-w-0">Collaborateur</TableHead>
                      <TableHead className="hidden md:table-cell min-w-0">Affectation</TableHead>
                      <TableHead className="w-[1%] whitespace-nowrap text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRows.map((row, idx) => (
                      <TableRow
                        key={row.id}
                        className={cn(
                          idx % 2 === 1 ? 'bg-muted/30 hover:bg-muted/40' : 'hover:bg-muted/20'
                        )}
                      >
                        <TableCell className="align-top py-3 min-w-0">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-sm leading-snug">
                                {row.prenom} {row.nom}
                              </span>
                              {showRole && (
                                <Badge
                                  variant="outline"
                                  className="font-normal text-[10px] h-5 shrink-0"
                                >
                                  {libellerRole(row.role)}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground break-all">{row.email}</p>
                            <div className="md:hidden space-y-0.5 text-xs text-muted-foreground pt-0.5">
                              {(row.directionNom || row.serviceNom) && (
                                <p>
                                  {[row.directionNom, row.serviceNom].filter(Boolean).join(' / ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell align-top py-3 min-w-0">
                          <p className="text-sm font-medium leading-snug">
                            {[row.directionNom, row.serviceNom].filter(Boolean).join(' / ') || '—'}
                          </p>
                        </TableCell>
                        <TableCell className="align-middle text-right py-3">
                          <Button size="sm" asChild className="gap-1.5">
                            <Link href={`/manager/assignation/${row.id}`}>
                              <Target className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Définir les KPI</span>
                              <span className="sm:hidden">KPI</span>
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    {(currentPage - 1) * pageSize + 1}–
                    {Math.min(currentPage * pageSize, totalFiltered)} sur {totalFiltered}
                  </span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => setPageSize(Number(v))}
                  >
                    <SelectTrigger className="w-[70px] h-8">
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
                  <span>par page</span>
                </div>
                {totalPages > 1 && (
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
                              onClick={(e) => {
                                e.preventDefault()
                                setPage(p)
                              }}
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      })}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage < totalPages) setPage((p) => p + 1)
                          }}
                          className={
                            currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
