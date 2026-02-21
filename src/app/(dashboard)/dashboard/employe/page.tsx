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
import { Progress } from '@/components/ui/progress'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  RadialBarChart,
  RadialBar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react'
import { CardSkeleton } from '@/components/card-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

type Periode = { id: number; code: string; statut: string }
type KpiDetail = {
  kpiEmployeId: number
  nom: string
  unite: string | null
  cible: number
  valeurAgregee: number
  tauxAtteinte: number
  poids: number
  contributionServicePct: number
  serviceNom: string
  directionNom?: string
  contributionDirectionPct?: number
}
type Contribution = { kpiNom: string; serviceNom: string; contributionPct: number }
type EvolutionPoint = { label: string; byKpi: Record<string, number> }
type DashboardData = {
  userId: number
  periodeId: number
  scoreGlobal: number
  details: KpiDetail[]
  contributionsService: Contribution[]
  contributionsDirection: { kpiNom: string; directionNom: string; contributionPct: number }[]
  comparaisonVsPrecedent: number | null
  evolutionMois: EvolutionPoint[]
  periode?: { id: number; mois_debut: number; mois_fin: number; annee: number }
}

const SCORE_COLORS = ['#ef4444', '#f97316', '#22c55e', '#3b82f6'] as const
function scoreColor(score: number): string {
  if (score < 70) return SCORE_COLORS[0]
  if (score < 90) return SCORE_COLORS[1]
  if (score < 100) return SCORE_COLORS[2]
  return SCORE_COLORS[3]
}
function progressBarClass(score: number): string {
  if (score < 70) return '[&_[data-slot=progress-indicator]]:!bg-red-500'
  if (score < 90) return '[&_[data-slot=progress-indicator]]:!bg-orange-500'
  if (score < 100) return '[&_[data-slot=progress-indicator]]:!bg-green-500'
  return '[&_[data-slot=progress-indicator]]:!bg-blue-500'
}

export default function DashboardEmployePage() {
  const [mounted, setMounted] = useState(false)
  const [periodes, setPeriodes] = useState<Periode[]>([])
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
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
    if (list.length > 0 && periodeId == null) {
      setPeriodeId(enCours ? enCours.id : list[0].id)
    }
  }, [periodeId])

  const fetchDashboard = useCallback(async () => {
    if (periodeId == null) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard/employe?periodeId=${periodeId}`)
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

  const LINE_COLORS = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#14b8a6']
  const chartConfig = data?.details?.reduce(
    (acc, d, i) => ({
      ...acc,
      [d.nom]: { label: d.nom, color: LINE_COLORS[i % LINE_COLORS.length] },
    }),
    {} as Record<string, { label: string; color: string }>
  ) ?? {}

  const radialData = data
    ? [{ name: 'Score', value: Math.min(100, Math.min(150, data.scoreGlobal)), fill: scoreColor(data.scoreGlobal) }]
    : []

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Tableau de bord Employé</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord Employé</h1>
          <p className="text-muted-foreground">Mes KPI, score et contribution.</p>
        </div>
        {mounted ? (
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
        ) : (
          <div className="h-9 w-[200px] rounded-md border border-input bg-muted/50" aria-hidden />
        )}
      </div>

      {loading && !data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <CardSkeleton lines={4} />
            <CardSkeleton lines={4} />
          </div>
          <CardSkeleton lines={6} showHeader />
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </div>
      ) : data ? (
        <>
          {/* Section 1 — Score global */}
          <Card>
            <CardHeader>
              <CardTitle>Score global</CardTitle>
              <CardDescription>Performance sur la période sélectionnée</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-48 h-48">
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
                <div className="text-center -mt-20 text-2xl font-bold">
                  {data.scoreGlobal.toFixed(0)} %
                </div>
              </div>
              <div className="flex-1">
                {data.comparaisonVsPrecedent != null && (
                  <p className="flex items-center gap-2 text-sm">
                    {data.comparaisonVsPrecedent > 0 && (
                      <>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        +{data.comparaisonVsPrecedent.toFixed(1)} pts vs période précédente
                      </>
                    )}
                    {data.comparaisonVsPrecedent < 0 && (
                      <>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        {data.comparaisonVsPrecedent.toFixed(1)} pts vs période précédente
                      </>
                    )}
                    {data.comparaisonVsPrecedent === 0 && (
                      <>
                        <Minus className="h-4 w-4 text-muted-foreground" />
                        Identique à la période précédente
                      </>
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section 2 — Détail par KPI */}
          <Card>
            <CardHeader>
              <CardTitle>Détail par KPI</CardTitle>
              <CardDescription>Cible, réalisé et taux d&apos;atteinte</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.details.map((d) => (
                  <Card key={d.kpiEmployeId}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        {d.nom}
                      </CardTitle>
                      <CardDescription>
                        Cible : {d.cible} {d.unite ?? ''} — Réalisé : {d.valeurAgregee.toFixed(2)} {d.unite ?? ''}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Taux</span>
                          <span className="font-medium">{d.tauxAtteinte.toFixed(0)} %</span>
                        </div>
                        <Progress
                          value={Math.min(150, d.tauxAtteinte)}
                          className={progressBarClass(d.tauxAtteinte)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {data.details.length === 0 && (
                <p className="text-muted-foreground text-sm">Aucun KPI pour cette période.</p>
              )}
            </CardContent>
          </Card>

          {/* Section 3 — Ma contribution */}
          <Card>
            <CardHeader>
              <CardTitle>Ma contribution</CardTitle>
              <CardDescription>Contribution aux KPI du service et de la direction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.contributionsService.map((c, i) => (
                <p key={i} className="text-sm">
                  Je contribue à <strong>{c.contributionPct.toFixed(0)} %</strong> du KPI &quot;{c.kpiNom}&quot; de mon service {c.serviceNom}.
                </p>
              ))}
              {data.contributionsDirection.map((c, i) => (
                <p key={i} className="text-sm">
                  Mon service contribue à <strong>{c.contributionPct.toFixed(0)} %</strong> du KPI &quot;{c.kpiNom}&quot; de la Direction {c.directionNom}.
                </p>
              ))}
              {data.contributionsService.length === 0 && data.contributionsDirection.length === 0 && (
                <p className="text-muted-foreground text-sm">Aucune contribution à afficher.</p>
              )}
            </CardContent>
          </Card>

          {/* Section 4 — Évolution mensuelle */}
          {data.evolutionMois?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Évolution mensuelle</CardTitle>
                <CardDescription>Taux d&apos;atteinte sur les 6 derniers mois par KPI</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <LineChart
                    data={data.evolutionMois.map(({ label, byKpi }) => ({ label, ...byKpi }))}
                    margin={{ left: 12, right: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis domain={[0, 150]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    {data.details.map((d, i) => (
                      <Line
                        key={d.kpiEmployeId}
                        type="monotone"
                        dataKey={d.nom}
                        stroke={LINE_COLORS[i % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot
                      />
                    ))}
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}
