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
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  AlertTriangle,
  LayoutDashboard,
  Calendar,
  Building2,
  Briefcase,
  LayoutGrid,
  Gauge,
  Loader2,
  AlertCircle,
  User,
} from 'lucide-react'
import { MesKpiPersoSection } from '@/components/dashboard/mes-kpi-perso-section'

type Periode = { id: number; code: string; statut: string }
type ServiceRow = {
  serviceId: number
  serviceNom: string
  tauxAtteinte: number
  nbEmployes: number
  tendance: number | null
}
type DirecteurData = {
  periodeId: number
  scoreDirection: number
  services: ServiceRow[]
  heatmap: { serviceNom: string; kpi: Record<string, number> }[]
  kpiNoms: string[]
  top5: { nom: string; prenom: string; score: number }[]
  bottom5: { nom: string; prenom: string; score: number }[]
}

function heatmapCellClass(value: number): string {
  if (value < 70) return 'bg-red-500/30 text-red-900 dark:text-red-100'
  if (value < 90) return 'bg-orange-500/30 text-orange-900 dark:text-orange-100'
  if (value < 100) return 'bg-green-500/20 text-green-900 dark:text-green-100'
  return 'bg-blue-500/20 text-blue-900 dark:text-blue-100'
}

export default function DashboardDirecteurPage() {
  const [mounted, setMounted] = useState(false)
  const [periodes, setPeriodes] = useState<Periode[]>([])
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [data, setData] = useState<DirecteurData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      const res = await fetch(`/api/dashboard/directeur?periodeId=${periodeId}`)
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

  const radialData = data
    ? [{ name: 'Direction', value: Math.min(100, data.scoreDirection), fill: '#3b82f6' }]
    : []

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tableau de bord Directeur</h1>
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Tableau de bord Directeur</h1>
            <p className="text-muted-foreground">Performance de la direction et des services.</p>
          </div>
        </div>
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
      </div>

      {/* Section "Mes KPI Personnels" (vue double avec dashboard direction) */}
      <MesKpiPersoSection assigneParLabel="le DG" />

      {/* Séparateur puis vue direction */}
      <div className="border-t pt-6 mt-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Performance de la direction
        </h2>
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
          {/* Section 1 — Score direction */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Gauge className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Score direction</CardTitle>
                  <CardDescription>Taux d&apos;atteinte moyen de la direction sur la période</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <div className="w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="70%"
                    outerRadius="100%"
                    data={radialData}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar dataKey="value" cornerRadius={8} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-center -mt-16 text-xl font-bold">
                  {data.scoreDirection.toFixed(0)} %
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2 — Performance par service */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Performance par service</CardTitle>
                  <CardDescription>Taux, effectif et tendance vs période précédente</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        Service
                      </span>
                    </TableHead>
                    <TableHead className="text-right">Taux atteinte %</TableHead>
                    <TableHead className="text-right">Nb employés</TableHead>
                    <TableHead className="text-right">Tendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.services.map((s) => (
                    <TableRow key={s.serviceId}>
                      <TableCell className="font-medium">{s.serviceNom}</TableCell>
                      <TableCell className="text-right">{s.tauxAtteinte.toFixed(0)} %</TableCell>
                      <TableCell className="text-right">{s.nbEmployes}</TableCell>
                      <TableCell className="text-right">
                        {s.tendance != null ? (
                          <span className="inline-flex items-center gap-1">
                            {s.tendance > 0 && <TrendingUp className="h-4 w-4 text-green-600" />}
                            {s.tendance < 0 && <TrendingDown className="h-4 w-4 text-red-600" />}
                            {s.tendance === 0 && <Minus className="h-4 w-4 text-muted-foreground" />}
                            {s.tendance > 0 ? '+' : ''}{s.tendance.toFixed(1)} pts
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.services.length === 0 && (
                <p className="text-muted-foreground text-sm py-4">Aucun service.</p>
              )}
            </CardContent>
          </Card>

          {/* Section 3 — Heatmap Services x KPI */}
          {data.heatmap?.length > 0 && data.kpiNoms?.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle>Heatmap Services × KPI</CardTitle>
                    <CardDescription>Taux d&apos;atteinte par service et par KPI</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[140px]">Service</TableHead>
                        {data.kpiNoms.map((k) => (
                          <TableHead key={k} className="text-center min-w-[80px]">{k}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.heatmap.map((row) => (
                        <TableRow key={row.serviceNom}>
                          <TableCell className="font-medium">{row.serviceNom}</TableCell>
                          {data.kpiNoms.map((k) => (
                            <TableCell
                              key={k}
                              className={`text-center ${heatmapCellClass(row.kpi[k] ?? 0)}`}
                            >
                              {row.kpi[k] != null ? `${Math.round(row.kpi[k])} %` : '—'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 4 — Top 5 / 5 en difficulté */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5 text-green-600 dark:text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Top 5 performers
                    </CardTitle>
                    <CardDescription>Employés avec le meilleur score global</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.top5.map((e, i) => (
                    <li key={i} className="flex justify-between text-sm items-center gap-2">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {e.nom} {e.prenom}
                      </span>
                      <span className="font-medium text-green-600">{e.score.toFixed(0)} %</span>
                    </li>
                  ))}
                </ul>
                {data.top5.length === 0 && (
                  <p className="text-muted-foreground text-sm">Aucune donnée.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-500" />
                  </div>
                  <div>
                    <CardTitle>5 en difficulté</CardTitle>
                    <CardDescription>Employés à accompagner</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.bottom5.map((e, i) => (
                    <li key={i} className="flex justify-between text-sm items-center gap-2">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {e.nom} {e.prenom}
                      </span>
                      <span className="font-medium text-orange-600">{e.score.toFixed(0)} %</span>
                    </li>
                  ))}
                </ul>
                {data.bottom5.length === 0 && (
                  <p className="text-muted-foreground text-sm">Aucune donnée.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}
