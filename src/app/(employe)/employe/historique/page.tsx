'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
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
import { Badge } from '@/components/ui/badge'
import { NotationBadge } from '@/components/notation/NotationBadge'
import { GrilleReference } from '@/components/notation/GrilleReference'
import { useNotationGrille } from '@/contexts/notation-grille-context'
import { cn } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  History,
  Calendar,
  Target,
  Loader2,
  MessageSquareQuote,
  Minus,
} from 'lucide-react'
import {
  Line,
  Bar,
  BarChart,
  LineChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
  Cell,
  RadialBar,
  RadialBarChart,
} from 'recharts'

type PeriodeOption = { id: number; code: string }
type DetailRow = {
  nom: string
  type: string
  cible: number
  realise: number
  taux: number
  poids?: number
  statut: string
}
type EvolutionPoint = { periodeId: number; code: string; scoreGlobal: number }
type ScoreMois = { mois: number; annee: number; label: string; scorePct: number }
type MoisPeriode = { mois: number; annee: number; label: string }
type RealisationMois = {
  mois: number
  valeur: number | null
  statut: string | null
  taux: number | null
}
type KpiParMois = {
  kpiEmployeId: number
  nom: string
  cible: number
  unite: string | null
  tauxPeriode: number | null
  realisePeriode: number | null
  realisations_par_mois: RealisationMois[]
}
type ApiResponse = {
  periodeId: number
  periodeCode: string
  detailPeriode: {
    scoreGlobal: number
    details: DetailRow[]
    appreciation?: string
    commentaire?: string
  }
  comparaisonVsPrecedent: number | null
  evolution: EvolutionPoint[]
  scoreParMois: ScoreMois[]
  moisPeriode: MoisPeriode[]
  kpiParMois: KpiParMois[]
  periodes: PeriodeOption[]
}

const TYPE_LABELS: Record<string, string> = {
  QUANTITATIF: 'Quantitatif',
  QUALITATIF: 'Qualitatif',
  COMPORTEMENTAL: 'Comportemental',
}

const STATUT_SAISIE_MAP: Record<string, { label: string; className: string }> = {
  VALIDEE: { label: 'Validée', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  AJUSTEE: { label: 'Ajustée', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  SOUMISE: { label: 'Soumise', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  OUVERTE: { label: 'En cours', className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  EN_RETARD: { label: 'En retard', className: 'bg-red-500/10 text-red-700 dark:text-red-400' },
}

function MonthlyScoreTooltip({
  active,
  payload,
  label,
  getNotation,
}: {
  active?: boolean
  payload?: { value?: number }[]
  label?: string
  getNotation: (taux: number) => { textClassName: string; appreciation: string }
}) {
  if (!active || !payload?.length) return null
  const score = payload[0]?.value as number
  if (!score || score <= 0) return null
  const n = getNotation(score)
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-xs max-w-[200px]">
      <p className="font-medium mb-1">{label}</p>
      <p className={cn('text-base font-bold tabular-nums', n.textClassName)}>{score.toFixed(1)}%</p>
      <p className="text-muted-foreground mt-1">{n.appreciation}</p>
    </div>
  )
}

function ScoreGauge({ value, color }: { value: number; color: string }) {
  const data = [{ value: Math.min(100, Math.max(0, value)), fill: color }]
  return (
    <div className="relative w-36 h-28 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="68%"
          outerRadius="100%"
          data={data}
          startAngle={200}
          endAngle={-20}
          cx="50%"
          cy="72%"
        >
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'hsl(var(--muted))' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-x-0 bottom-3 text-center pointer-events-none">
        <span className="text-xl font-bold tabular-nums leading-none" style={{ color }}>
          {value.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground ml-0.5">%</span>
      </div>
    </div>
  )
}

export default function HistoriquePage() {
  const { getNotation } = useNotationGrille()
  const [periodes, setPeriodes] = useState<PeriodeOption[]>([])
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchHistorique = useCallback(async () => {
    const url =
      periodeId != null
        ? `/api/employe/historique?periodeId=${periodeId}`
        : '/api/employe/historique'
    const res = await fetch(url)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err?.error ?? 'Chargement historique')
      setData(null)
      return
    }
    const json = await res.json()
    setData(json)
    if (json.periodes?.length > 0 && periodes.length === 0) {
      setPeriodes(json.periodes)
      if (!periodeId) setPeriodeId(json.periodeId ?? json.periodes[0]?.id)
    }
  }, [periodeId, periodes.length])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchHistorique().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [fetchHistorique])

  useEffect(() => {
    if (data?.periodes?.length && periodes.length === 0) {
      setPeriodes(data.periodes)
    }
  }, [data, periodes.length])

  const selectedPeriodeCode =
    data?.periodeCode ?? (periodeId && periodes.find((p) => p.id === periodeId)?.code) ?? ''
  const scoreGlobal = data?.detailPeriode?.scoreGlobal ?? 0
  const details = data?.detailPeriode?.details ?? []
  const comparaison = data?.comparaisonVsPrecedent ?? null
  const evolution = data?.evolution ?? []
  const scoreParMois = (data?.scoreParMois ?? []).map((m) => ({
    ...m,
    score: m.scorePct > 0 ? m.scorePct : null,
  }))
  const moisPeriode = data?.moisPeriode ?? []
  const kpiParMois = data?.kpiParMois ?? []
  const hasMonthlyScores = scoreParMois.some((s) => s.score != null && s.score > 0)
  const hasMonthlyKpiData = kpiParMois.length > 0 && moisPeriode.length > 0
  const notationGlobale = scoreGlobal > 0 ? getNotation(scoreGlobal) : null
  const scoreParMoisColores = scoreParMois.map((m) => ({
    ...m,
    couleur: m.score != null && m.score > 0 ? getNotation(m.score).chartColor : null,
  }))
  const moisScoresActifs = scoreParMoisColores.filter((m) => m.score != null && m.score > 0)
  const couleurCourbeDebut = moisScoresActifs[0]?.couleur ?? notationGlobale?.chartColor ?? 'hsl(var(--primary))'
  const couleurCourbeFin =
    moisScoresActifs[moisScoresActifs.length - 1]?.couleur ?? couleurCourbeDebut
  const gestionParPoids = details.some((d) => (d.poids ?? 0) > 0)

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mon historique</h1>
            <p className="text-muted-foreground text-sm">
              Objectifs, saisies et performances par période
              {selectedPeriodeCode && (
                <Badge variant="outline" className="ml-2 font-normal">
                  {selectedPeriodeCode}
                </Badge>
              )}
            </p>
          </div>
        </div>
        {!loading && (data?.periodes ?? periodes).length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select
              value={periodeId != null ? String(periodeId) : 'none'}
              onValueChange={(v) =>
                v !== 'none' ? setPeriodeId(parseInt(v, 10)) : setPeriodeId(null)
              }
            >
              <SelectTrigger className="w-[200px] border-0 bg-transparent shadow-none focus:ring-0">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                {(data?.periodes ?? periodes).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {loading && !data ? (
        <Card>
          <CardContent className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Chargement de l&apos;historique…
          </CardContent>
        </Card>
      ) : !data ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucune donnée disponible. Vérifiez vos KPI assignés et vos saisies.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-border/60 sm:col-span-2 overflow-hidden">
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {scoreGlobal > 0 && notationGlobale ? (
                    <ScoreGauge value={scoreGlobal} color={notationGlobale.chartColor} />
                  ) : (
                    <div className="w-36 h-28 flex items-center justify-center text-muted-foreground text-sm text-center px-2">
                      Pas de score
                    </div>
                  )}
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <p className="text-sm font-semibold">Score global — {selectedPeriodeCode}</p>
                    {notationGlobale ? (
                      <>
                        <NotationBadge taux={scoreGlobal} showTaux />
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 flex gap-2 text-left">
                          <MessageSquareQuote className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                            {notationGlobale.commentaire}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune saisie validée sur cette période.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">KPI suivis</p>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-bold tabular-nums">{details.length}</p>
                {comparaison != null && (
                  <div
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      comparaison > 0
                        ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                        : comparaison < 0
                          ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                          : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {comparaison > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : comparaison < 0 ? (
                      <TrendingDown className="h-3.5 w-3.5" />
                    ) : (
                      <Minus className="h-3.5 w-3.5" />
                    )}
                    {comparaison > 0 ? '+' : ''}
                    {comparaison.toFixed(1)} pts vs période préc.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <GrilleReference
            variant="officielle"
            collapsible
            defaultOpen={false}
            description="Référentiel des appréciations et commentaires affichés ci-dessous"
          />

          <Card className="border-border/60 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 border-b py-3">
              <CardTitle className="text-base">Détail par KPI</CardTitle>
              <CardDescription>Objectifs, réalisations et notation pour {selectedPeriodeCode}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {details.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  Aucun KPI assigné pour cette période.
                </p>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="min-w-[180px]">KPI</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Cible</TableHead>
                        <TableHead className="text-right">Réalisé</TableHead>
                        {gestionParPoids && <TableHead className="text-right">Poids</TableHead>}
                        <TableHead className="text-right">Taux</TableHead>
                        <TableHead className="min-w-[180px]">Appréciation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {details.map((d, idx) => {
                        const notation = getNotation(d.taux)
                        const stripe = idx % 2 === 1
                        return (
                          <TableRow
                            key={d.nom + idx}
                            className={cn(stripe ? 'bg-muted/40 hover:bg-muted/55' : 'hover:bg-muted/25')}
                          >
                            <TableCell className="font-medium max-w-xs whitespace-normal break-words leading-snug text-sm">
                              {d.nom}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-normal text-xs">
                                {TYPE_LABELS[d.type] ?? d.type ?? '—'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{d.cible}</TableCell>
                            <TableCell className="text-right tabular-nums">{d.realise}</TableCell>
                            {gestionParPoids && (
                              <TableCell className="text-right tabular-nums text-muted-foreground">
                                {d.poids != null && d.poids > 0 ? `${d.poids}%` : '—'}
                              </TableCell>
                            )}
                            <TableCell className="text-right">
                              <span className={cn('font-semibold tabular-nums', notation.textClassName)}>
                                {d.taux.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="align-top">
                              <div className="space-y-1">
                                <NotationBadge taux={d.taux} variant="text" />
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                  {notation.commentaire}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {hasMonthlyKpiData && (
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 border-b py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Réalisations par mois
                </CardTitle>
                <CardDescription>
                  Détail mensuel par KPI — {selectedPeriodeCode}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto -mx-1 px-1 rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="min-w-[180px] sticky left-0 bg-muted/50 z-10">KPI</TableHead>
                        <TableHead className="text-right">Cible</TableHead>
                        {moisPeriode.map((m) => (
                          <TableHead
                            key={m.mois}
                            className="text-right min-w-[80px] whitespace-nowrap text-xs"
                          >
                            {m.label}
                          </TableHead>
                        ))}
                        <TableHead className="text-right min-w-[88px] whitespace-nowrap">Global</TableHead>
                        <TableHead className="min-w-[180px]">Appréciation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kpiParMois.map((k, idx) => {
                        const fmt = (v: number | null | undefined) =>
                          v != null ? `${Number(v).toFixed(1)}${k.unite ? ` ${k.unite}` : ''}` : '—'
                        const kpiNotation = k.tauxPeriode != null ? getNotation(k.tauxPeriode) : null
                        const stripe = idx % 2 === 1
                        return (
                          <TableRow
                            key={k.kpiEmployeId}
                            className={cn(stripe ? 'bg-muted/40 hover:bg-muted/55' : 'hover:bg-muted/25')}
                          >
                            <TableCell
                              className={cn(
                                'font-medium max-w-xs whitespace-normal break-words leading-snug text-sm sticky left-0 z-10',
                                stripe ? 'bg-muted/40' : 'bg-background'
                              )}
                            >
                              {k.nom}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{k.cible}</TableCell>
                            {moisPeriode.map((m) => {
                              const rm = k.realisations_par_mois.find((r) => r.mois === m.mois)
                              const statutSaisie = rm?.statut ? STATUT_SAISIE_MAP[rm.statut] : null
                              const moisNotation = rm?.taux != null ? getNotation(rm.taux) : null
                              const affichageMois =
                                rm?.taux != null ? `${rm.taux.toFixed(1)}%` : fmt(rm?.valeur)
                              return (
                                <TableCell key={m.mois} className="text-right align-top p-2">
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span
                                      className={cn(
                                        'tabular-nums text-sm font-medium',
                                        moisNotation?.textClassName
                                      )}
                                    >
                                      {affichageMois}
                                    </span>
                                    {statutSaisie &&
                                      rm?.statut !== 'VALIDEE' &&
                                      rm?.statut !== 'AJUSTEE' && (
                                        <Badge
                                          className={`${statutSaisie.className} text-[10px] px-1 py-0 w-fit`}
                                        >
                                          {statutSaisie.label}
                                        </Badge>
                                      )}
                                  </div>
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-right tabular-nums font-semibold">
                              {k.tauxPeriode != null ? (
                                <span className={cn(kpiNotation?.textClassName)}>
                                  {k.tauxPeriode.toFixed(1)}%
                                </span>
                              ) : (
                                fmt(k.realisePeriode)
                              )}
                            </TableCell>
                            <TableCell className="align-top">
                              {kpiNotation ? (
                                <div className="space-y-1">
                                  <NotationBadge taux={k.tauxPeriode!} variant="text" />
                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {kpiNotation.commentaire}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {hasMonthlyScores && (
                        <TableRow className="bg-muted/60 hover:bg-muted/60 font-medium border-t-2">
                          <TableCell className="sticky left-0 bg-muted/60 z-10">Score mensuel</TableCell>
                          <TableCell />
                          {scoreParMois.map((s) => {
                            const n = s.scorePct > 0 ? getNotation(s.scorePct) : null
                            return (
                              <TableCell key={s.mois} className="text-right p-2">
                                {n ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className={cn('tabular-nums text-sm', n.textClassName)}>
                                      {s.scorePct.toFixed(1)}%
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">{n.appreciation}</span>
                                  </div>
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                            )
                          })}
                          <TableCell className="text-right">
                            {scoreGlobal > 0 ? (
                              <span
                                className={cn(
                                  'font-semibold tabular-nums',
                                  notationGlobale?.textClassName
                                )}
                              >
                                {scoreGlobal.toFixed(1)}%
                              </span>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell>
                            {notationGlobale && (
                              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                {notationGlobale.commentaire}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {hasMonthlyScores && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="bg-muted/30 border-b py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Score par mois
                </CardTitle>
                <CardDescription>Évolution mensuelle — {selectedPeriodeCode}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                    <p className="text-sm font-semibold mb-1">Histogramme</p>
                    <p className="text-xs text-muted-foreground mb-3">Score par mois (barres)</p>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={scoreParMois} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis
                            domain={[0, 120]}
                            tickFormatter={(v) => `${v}%`}
                            width={34}
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <Tooltip content={(props) => <MonthlyScoreTooltip {...props} getNotation={getNotation} />} />
                          <ReferenceLine
                            y={100}
                            stroke="hsl(var(--muted-foreground))"
                            strokeDasharray="4 4"
                            strokeOpacity={0.5}
                          />
                          <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={36}>
                            {scoreParMois.map((entry, index) => (
                              <Cell
                                key={index}
                                fill={
                                  entry.score != null && entry.score > 0
                                    ? getNotation(entry.score).chartColor
                                    : 'hsl(var(--muted))'
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                    <p className="text-sm font-semibold mb-1">Courbe d&apos;évolution</p>
                    <p className="text-xs text-muted-foreground mb-3">Tendance mensuelle colorée par notation</p>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={scoreParMoisColores}
                          margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                        >
                          <defs>
                            <linearGradient id="historiqueCourbeLigne" x1="0" y1="0" x2="1" y2="0">
                              {moisScoresActifs.map((m, i) => (
                                <stop
                                  key={m.mois}
                                  offset={`${(i / Math.max(moisScoresActifs.length - 1, 1)) * 100}%`}
                                  stopColor={m.couleur!}
                                />
                              ))}
                            </linearGradient>
                            <linearGradient id="historiqueCourbeZone" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={couleurCourbeFin} stopOpacity={0.4} />
                              <stop offset="45%" stopColor={couleurCourbeDebut} stopOpacity={0.18} />
                              <stop offset="100%" stopColor={couleurCourbeDebut} stopOpacity={0} />
                            </linearGradient>
                            <filter id="historiqueCourbeGlow" x="-50%" y="-50%" width="200%" height="200%">
                              <feGaussianBlur stdDeviation="2" result="blur" />
                              <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                            tickLine={false}
                          />
                          <YAxis
                            domain={[0, 120]}
                            tickFormatter={(v) => `${v}%`}
                            width={34}
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip content={(props) => <MonthlyScoreTooltip {...props} getNotation={getNotation} />} />
                          <ReferenceLine
                            y={100}
                            stroke="hsl(var(--muted-foreground))"
                            strokeDasharray="4 4"
                            strokeOpacity={0.5}
                          />
                          <Area
                            type="natural"
                            dataKey="score"
                            stroke="none"
                            fill="url(#historiqueCourbeZone)"
                            connectNulls
                          />
                          <Line
                            type="natural"
                            dataKey="score"
                            stroke="url(#historiqueCourbeLigne)"
                            strokeWidth={3}
                            filter="url(#historiqueCourbeGlow)"
                            dot={(props) => {
                              const { cx, cy, payload, index } = props
                              if (payload.score == null || payload.score <= 0 || !payload.couleur) return null
                              const color = payload.couleur as string
                              return (
                                <g key={`mois-dot-${index}`}>
                                  <circle cx={cx} cy={cy} r={9} fill={color} opacity={0.22} />
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={5.5}
                                    fill={color}
                                    stroke="hsl(var(--background))"
                                    strokeWidth={2.5}
                                  />
                                </g>
                              )
                            }}
                            activeDot={(props) => {
                              const { cx, cy, payload } = props
                              const color = (payload?.couleur as string) ?? 'hsl(var(--primary))'
                              return (
                                <g>
                                  <circle cx={cx} cy={cy} r={12} fill={color} opacity={0.25} />
                                  <circle
                                    cx={cx}
                                    cy={cy}
                                    r={7}
                                    fill={color}
                                    stroke="hsl(var(--background))"
                                    strokeWidth={2.5}
                                  />
                                </g>
                              )
                            }}
                            connectNulls
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-3 border-t text-xs">
                  {scoreParMois
                    .filter((s) => s.score != null && s.score > 0)
                    .map((s) => {
                      const n = getNotation(s.score!)
                      return (
                        <div
                          key={s.mois}
                          className="rounded-lg border border-border/60 bg-muted/20 px-2 py-1 flex items-center gap-1.5"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: n.chartColor }}
                          />
                          <span className="text-muted-foreground">{s.label}</span>
                          <span className={cn('font-semibold tabular-nums', n.textClassName)}>
                            {s.score!.toFixed(1)}%
                          </span>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {evolution.filter((e) => e.scoreGlobal > 0).length > 1 && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="bg-muted/30 border-b py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Évolution sur les périodes
                </CardTitle>
                <CardDescription>Score global consolidé dans le temps</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolution} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="code" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis
                        domain={[0, 120]}
                        tickFormatter={(v) => `${v}%`}
                        width={34}
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null
                          const score = payload[0]?.value as number
                          if (score == null) return null
                          const n = getNotation(score)
                          return (
                            <div className="rounded-lg border bg-background p-3 shadow-md text-xs">
                              <p className="font-medium mb-1">Période {label}</p>
                              <p className={cn('text-base font-bold tabular-nums', n.textClassName)}>
                                {score.toFixed(1)}%
                              </p>
                              <p className="text-muted-foreground mt-1">{n.appreciation}</p>
                            </div>
                          )
                        }}
                      />
                      <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeOpacity={0.5} />
                      <Line
                        type="monotone"
                        dataKey="scoreGlobal"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={(props) => {
                          const { cx, cy, payload, index } = props
                          const color = getNotation(payload.scoreGlobal).chartColor
                          return (
                            <circle
                              key={`evo-dot-${index}`}
                              cx={cx}
                              cy={cy}
                              r={4}
                              fill={color}
                              stroke="hsl(var(--background))"
                              strokeWidth={2}
                            />
                          )
                        }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {loading && data && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Mise à jour…
        </p>
      )}
    </div>
  )
}
