'use client'

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
import { Badge } from '@/components/ui/badge'
import { NotationBadge } from '@/components/notation/NotationBadge'
import { GrilleReference } from '@/components/notation/GrilleReference'
import { useNotationGrille } from '@/contexts/notation-grille-context'
import { cn } from '@/lib/utils'
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, MessageSquareQuote, TrendingDown, TrendingUp } from 'lucide-react'
import type { MoisPeriode, RealisationMois, ScoreMois } from '@/lib/kpi-realisations'

const STATUT_SAISIE_MAP: Record<string, { label: string; className: string }> = {
  VALIDEE: { label: 'Validée', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  AJUSTEE: { label: 'Ajustée', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  SOUMISE: { label: 'Soumise', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  OUVERTE: { label: 'En cours', className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  EN_RETARD: { label: 'En retard', className: 'bg-red-500/10 text-red-700 dark:text-red-400' },
}

export type KpiPerformanceRow = {
  id: number
  cible: number
  poids?: number
  taux_atteinte?: number | null
  realise_cumule?: number | null
  catalogueKpi: { nom: string; unite: string | null }
  realisations_par_mois?: RealisationMois[]
  kpiService?: { id: number } | null
}

export type PerformancePeriode = {
  scoreGlobal: number | null
  scoreParMois: ScoreMois[]
  moisPeriode: MoisPeriode[]
}

type EmployePerformanceSectionProps = {
  kpiList: KpiPerformanceRow[]
  performance: PerformancePeriode
  periodeCode?: string
  gestionParPoids?: boolean
  gradientId?: string
}

export function EmployePerformanceSection({
  kpiList,
  performance,
  periodeCode,
  gestionParPoids = false,
  gradientId = 'scoreMoisGradient',
}: EmployePerformanceSectionProps) {
  const { getNotation } = useNotationGrille()

  const kpisAvecTaux = kpiList.filter((k) => k.taux_atteinte != null)
  const scoreMoyenKpi =
    kpisAvecTaux.length > 0
      ? Math.round(
          (kpisAvecTaux.reduce((s, k) => s + (k.taux_atteinte ?? 0), 0) / kpisAvecTaux.length) * 10
        ) / 10
      : null
  const displayScore = performance.scoreGlobal ?? scoreMoyenKpi
  const scoreParMoisChart = performance.scoreParMois.map((s) => ({
    ...s,
    score: s.scorePct > 0 ? s.scorePct : null,
  }))
  const hasMonthlyScores = scoreParMoisChart.some((s) => s.score != null && s.score > 0)
  const moisAvecScore = scoreParMoisChart.filter((s) => s.score != null && s.score > 0)
  const tendanceMensuelle =
    moisAvecScore.length >= 2
      ? Math.round((moisAvecScore[moisAvecScore.length - 1].score! - moisAvecScore[0].score!) * 10) / 10
      : null
  const notationGlobale = displayScore != null ? getNotation(displayScore) : null
  const radialGaugeData =
    displayScore != null
      ? [
          {
            name: 'Score',
            value: Math.min(100, Math.max(0, displayScore)),
            fill: notationGlobale?.chartColor ?? '#3b82f6',
          },
        ]
      : []

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/30 border-b">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Réalisations sur la période
          {periodeCode && (
            <Badge variant="outline" className="font-normal ml-1">
              {periodeCode}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Scores, appréciations et commentaires selon la grille de notation configurée
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              borderColor: notationGlobale ? `${notationGlobale.chartColor}35` : undefined,
            }}
          >
            <div
              className="p-5 flex flex-col sm:flex-row items-center gap-6"
              style={{
                background: notationGlobale
                  ? `linear-gradient(135deg, ${notationGlobale.chartColor}14 0%, transparent 65%)`
                  : undefined,
              }}
            >
              <div className="relative w-56 h-40 shrink-0">
                {displayScore != null ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        innerRadius="68%"
                        outerRadius="100%"
                        data={radialGaugeData}
                        startAngle={200}
                        endAngle={-20}
                        cx="50%"
                        cy="72%"
                      >
                        <RadialBar
                          dataKey="value"
                          cornerRadius={12}
                          background={{ fill: 'hsl(var(--muted))' }}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-x-0 bottom-4 text-center pointer-events-none">
                      <span
                        className="text-2xl font-bold tabular-nums tracking-tight leading-none"
                        style={{ color: notationGlobale?.chartColor }}
                      >
                        {displayScore.toFixed(1)}
                      </span>
                      <span className="text-sm text-muted-foreground ml-0.5">%</span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex justify-between px-3 text-[10px] text-muted-foreground pointer-events-none">
                      <span>0</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-center px-4">
                    <p className="text-sm text-muted-foreground">
                      Aucune saisie pour afficher le score global
                    </p>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3 text-center sm:text-left w-full">
                <div>
                  <p className="text-sm font-semibold">Performance globale</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {!gestionParPoids && scoreMoyenKpi != null ? 'Moyenne des taux KPI' : 'Score consolidé'}
                  </p>
                </div>
                {displayScore != null && notationGlobale && (
                  <>
                    <NotationBadge taux={displayScore} showTaux />
                    <div
                      className="rounded-lg border p-3 flex gap-2.5 text-left"
                      style={{
                        borderColor: `${notationGlobale.chartColor}25`,
                        backgroundColor: `${notationGlobale.chartColor}08`,
                      }}
                    >
                      <MessageSquareQuote className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs font-medium" style={{ color: notationGlobale.chartColor }}>
                          {notationGlobale.appreciation}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {notationGlobale.commentaire}
                        </p>
                      </div>
                    </div>
                  </>
                )}
                {gestionParPoids && performance.scoreGlobal == null && scoreMoyenKpi != null && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Score provisoire — KPI non encore tous validés
                  </p>
                )}
              </div>
            </div>
          </div>

          {hasMonthlyScores ? (
            <div className="rounded-xl border p-4 flex flex-col">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <p className="text-sm font-semibold">Évolution mensuelle</p>
                  <p className="text-xs text-muted-foreground">
                    {gestionParPoids ? 'Score pondéré par mois' : 'Score moyen par mois'}
                  </p>
                </div>
                {tendanceMensuelle != null && tendanceMensuelle !== 0 && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                      tendanceMensuelle > 0
                        ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                        : 'bg-red-500/10 text-red-700 dark:text-red-400'
                    )}
                  >
                    {tendanceMensuelle > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    {tendanceMensuelle > 0 ? '+' : ''}
                    {tendanceMensuelle.toFixed(1)} pts
                  </span>
                )}
              </div>
              <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={scoreParMoisChart}
                    margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 120]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={34}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        const score = payload[0]?.payload?.score as number | null
                        if (score == null || score <= 0) return null
                        const n = getNotation(score)
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-md text-xs max-w-[220px]">
                            <p className="font-medium mb-1">{label}</p>
                            <p className={cn('text-base font-bold tabular-nums', n.textClassName)}>
                              {score.toFixed(1)}%
                            </p>
                            <p className="text-muted-foreground mt-1">{n.appreciation}</p>
                            <p className="text-muted-foreground mt-0.5 leading-relaxed">{n.commentaire}</p>
                          </div>
                        )
                      }}
                    />
                    <ReferenceLine
                      y={100}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                      label={{ value: '100%', position: 'insideTopRight', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="none"
                      fill={`url(#${gradientId})`}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={(props) => {
                        const { cx, cy, payload, index } = props
                        if (payload.score == null || payload.score <= 0) return null
                        const color = getNotation(payload.score).chartColor
                        return (
                          <circle
                            key={`score-dot-${payload.mois ?? index}`}
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill={color}
                            stroke="hsl(var(--background))"
                            strokeWidth={2}
                          />
                        )
                      }}
                      activeDot={{ r: 7 }}
                      connectNulls
                    />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={28} fillOpacity={0.25}>
                      {scoreParMoisChart.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={
                            entry.score != null && entry.score > 0
                              ? getNotation(entry.score).chartColor
                              : 'transparent'
                          }
                        />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t text-xs">
                {scoreParMoisChart
                  .filter((s) => s.score != null && s.score > 0)
                  .map((s) => {
                    const n = getNotation(s.score!)
                    return (
                      <div
                        key={s.mois}
                        className="rounded-lg border px-2.5 py-1.5 flex flex-col gap-0.5 min-w-[100px]"
                        style={{
                          borderColor: `${n.chartColor}30`,
                          backgroundColor: `${n.chartColor}08`,
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-block w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: n.chartColor }}
                          />
                          <span className="text-muted-foreground">{s.label}</span>
                          <span className={cn('font-semibold tabular-nums ml-auto', n.textClassName)}>
                            {s.score!.toFixed(1)}%
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground pl-3.5 truncate">
                          {n.appreciation}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-5 flex items-center justify-center text-center min-h-[200px]">
              <p className="text-sm text-muted-foreground">
                Les scores mensuels apparaîtront dès que des saisies seront enregistrées
              </p>
            </div>
          )}
        </div>

        <GrilleReference
          variant="officielle"
          collapsible
          defaultOpen={false}
          description="Référentiel utilisé pour les appréciations et commentaires ci-dessous"
        />

        <div className="overflow-x-auto -mx-1 px-1 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="min-w-[180px] sticky left-0 bg-muted/50 z-10">KPI</TableHead>
                <TableHead className="text-right">Cible</TableHead>
                {performance.moisPeriode.map((m) => (
                  <TableHead key={m.mois} className="text-right min-w-[80px] whitespace-nowrap text-xs">
                    {m.label}
                  </TableHead>
                ))}
                <TableHead className="text-right min-w-[88px] whitespace-nowrap">Global</TableHead>
                <TableHead className="min-w-[200px]">Appréciation & commentaire</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiList.map((k, idx) => {
                const unite = k.catalogueKpi.unite
                const fmt = (v: number | null | undefined) =>
                  v != null ? `${Number(v).toFixed(1)}${unite ? ` ${unite}` : ''}` : '—'
                const parMois = k.realisations_par_mois ?? []
                const kpiNotation = k.taux_atteinte != null ? getNotation(k.taux_atteinte) : null
                const stripe = idx % 2 === 1
                return (
                  <TableRow
                    key={k.id}
                    className={cn(
                      'group',
                      stripe ? 'bg-muted/40 hover:bg-muted/55' : 'hover:bg-muted/25'
                    )}
                  >
                    <TableCell
                      className={cn(
                        'font-medium max-w-xs whitespace-normal break-words leading-snug sticky left-0 z-10 transition-colors',
                        stripe
                          ? 'bg-muted/40 group-hover:bg-muted/55'
                          : 'bg-background group-hover:bg-muted/25'
                      )}
                    >
                      {k.catalogueKpi.nom}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{k.cible}</TableCell>
                    {performance.moisPeriode.map((m) => {
                      const rm = parMois.find((r) => r.mois === m.mois)
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
                            {statutSaisie && rm?.statut !== 'VALIDEE' && rm?.statut !== 'AJUSTEE' && (
                              <Badge className={`${statutSaisie.className} text-[10px] px-1 py-0 w-fit`}>
                                {statutSaisie.label}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right tabular-nums font-semibold">
                      {fmt(k.realise_cumule)}
                    </TableCell>
                    <TableCell className="align-top">
                      {kpiNotation ? (
                        <div className="space-y-1.5">
                          <NotationBadge taux={k.taux_atteinte!} showTaux variant="text" />
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
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
                  {performance.scoreParMois.map((s) => {
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
                    {displayScore != null ? (
                      <span className={cn('font-semibold tabular-nums', notationGlobale?.textClassName)}>
                        {displayScore.toFixed(1)}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {notationGlobale && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-medium text-foreground">{notationGlobale.appreciation}</span>
                        {' — '}
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
  )
}
