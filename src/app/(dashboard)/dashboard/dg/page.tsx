'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import {
  ChevronDown,
  ChevronRight,
  FileDown,
  Building2,
  Calendar,
  LayoutDashboard,
  Layers,
  Briefcase,
  User,
  AlertCircle,
  Loader2,
  Send,
  UnfoldVertical,
} from 'lucide-react'

type Periode = { id: number; code: string; statut: string }
type ChartDirection = { direction: string; taux: number }
type ServiceRow = {
  serviceId: number
  serviceNom: string
  taux: number
  employes: { nom: string; prenom: string; score: number }[]
}
type DirectionRow = {
  directionId: number
  directionNom: string
  taux: number
  services: ServiceRow[]
}
type DGData = {
  periodeId: number
  chartDirections: ChartDirection[]
  drillDown: DirectionRow[]
  nbPeriodesEnCours?: number
  nbDirecteursSansKpi?: number
}

export default function DashboardDGPage() {
  const [mounted, setMounted] = useState(false)
  const [periodes, setPeriodes] = useState<Periode[]>([])
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [data, setData] = useState<DGData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDirections, setOpenDirections] = useState<Set<number>>(new Set())

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchPeriodes = useCallback(async () => {
    const res = await fetch('/api/periodes')
    if (!res.ok) return
    const list = await res.json()
    setPeriodes(list)
    const enCours = list.find((p: Periode) => p.statut === 'EN_COURS')
    if (list.length > 0 && periodeId == null) setPeriodeId(enCours ? enCours.id : list[0].id)
  }, [periodeId])

  const fetchDashboard = useCallback(async () => {
    if (periodeId == null) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/dg?periodeId=${periodeId}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err?.error ?? 'Erreur chargement')
        setData(null)
        return
      }
      const json = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [periodeId])

  useEffect(() => {
    let cancelled = false
    fetchPeriodes().then(() => {
      if (!cancelled && periodeId != null) fetchDashboard()
    })
    return () => { cancelled = true }
  }, [fetchPeriodes, periodeId])

  useEffect(() => {
    if (periodeId != null && periodes.length > 0) fetchDashboard()
  }, [periodeId, fetchDashboard, periodes.length])

  const handlePrint = () => {
    if (data?.drillDown?.length) {
      setOpenDirections(new Set(data.drillDown.map((d) => d.directionId)))
      setTimeout(() => window.print(), 400)
    } else {
      window.print()
    }
  }

  const expandAll = () => {
    if (data?.drillDown?.length) {
      setOpenDirections(new Set(data.drillDown.map((d) => d.directionId)))
    }
  }

  const toggleDirection = (directionId: number) => {
    setOpenDirections((prev) => {
      const next = new Set(prev)
      if (next.has(directionId)) next.delete(directionId)
      else next.add(directionId)
      return next
    })
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tableau de bord DG</h1>
            <p className="text-muted-foreground text-sm">Une erreur est survenue</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tableau de bord DG</h1>
            <p className="text-muted-foreground">Vue d&apos;ensemble des directions et indicateurs.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {mounted ? (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select
                value={periodeId?.toString() ?? ''}
                onValueChange={(v) => setPeriodeId(v ? parseInt(v, 10) : null)}
                disabled={loading}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
              <SelectContent>
                {periodes.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.code} {p.statut === 'EN_COURS' ? '(en cours)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="h-9 w-[200px] rounded-md border border-input bg-muted/50" aria-hidden />
          )}
          <Button onClick={expandAll} variant="ghost" size="sm" className="gap-2">
            <UnfoldVertical className="h-4 w-4" />
            Tout déplier
          </Button>
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <FileDown className="h-4 w-4" />
            Exporter rapport PDF
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <Card>
          <CardContent className="pt-6 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin shrink-0" />
            <span>Chargement…</span>
          </CardContent>
        </Card>
      ) : data ? (
        <>
          {/* Cartes d'action rapide */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Link href="/admin/periodes">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">Périodes</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Gérer les périodes d&apos;évaluation</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.nbPeriodesEnCours != null && (
                    <p className="text-2xl font-bold">{data.nbPeriodesEnCours} en cours</p>
                  )}
                </CardContent>
              </Card>
            </Link>
            <Link href="/manager/assignation">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">Assignations</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Assigner des KPI aux Directeurs</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.nbDirecteursSansKpi != null && (
                    <p className="text-2xl font-bold">{data.nbDirecteursSansKpi} Directeur(s) sans KPI</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* BarChart directions */}
          <Card className="print:break-inside-avoid">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Performance par direction</CardTitle>
                  <CardDescription>Taux d&apos;atteinte moyen par direction</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {data.chartDirections?.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={data.chartDirections}
                    margin={{ top: 12, right: 12, left: 12, bottom: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="direction" />
                    <YAxis domain={[0, 150]} />
                    <Bar dataKey="taux" name="Taux %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm">Aucune donnée.</p>
              )}
            </CardContent>
          </Card>

          {/* Tableau consolidé drill-down */}
          <Card className="print:break-inside-avoid">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Layers className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">Vue consolidée Direction → Service → Employé</CardTitle>
                  <CardDescription>Déplier une direction pour voir les services et les scores employés</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {data.drillDown?.length > 0 ? (
                <div className="space-y-2">
                  {data.drillDown.map((dir, idx) => (
                    <Collapsible
                      key={dir.directionId != null ? `dir-${dir.directionId}-${idx}` : `dir-${idx}`}
                      open={openDirections.has(dir.directionId)}
                      onOpenChange={() => toggleDirection(dir.directionId)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-2 no-print"
                        >
                          {openDirections.has(dir.directionId) ? (
                            <ChevronDown className="h-4 w-4 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          )}
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{dir.directionNom}</span>
                          <span className="text-muted-foreground ml-auto">{dir.taux.toFixed(0)} %</span>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-6 pt-2 space-y-4">
                          {dir.services.map((svc) => (
                            <div key={svc.serviceId} className="border-l-2 border-primary/20 pl-4">
                              <p className="font-medium text-sm flex items-center gap-2">
                                <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                {svc.serviceNom} — {svc.taux.toFixed(0)} %
                              </p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>
                                      <span className="flex items-center gap-1.5">
                                        <User className="h-3.5 w-3.5" />
                                        Employé
                                      </span>
                                    </TableHead>
                                    <TableHead className="text-right">Score %</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {svc.employes.map((e, i) => (
                                    <TableRow key={i}>
                                      <TableCell>{e.nom} {e.prenom}</TableCell>
                                      <TableCell className="text-right">{e.score.toFixed(0)} %</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Aucune donnée.</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
