'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  RadialBar,
  RadialBarChart,
} from 'recharts'
import {
  FileText,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Target,
  Calendar,
  Loader2,
  MessageSquareQuote,
  User,
  Mail,
} from 'lucide-react'
import { NotationBadge } from '@/components/notation/NotationBadge'
import { GrilleReference } from '@/components/notation/GrilleReference'
import { useNotationGrille } from '@/contexts/notation-grille-context'
import { libellerRole } from '@/lib/role-labels'
import { cn } from '@/lib/utils'

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
type ReportData = {
  user: { id: number; nom: string; prenom: string; email: string; role: string }
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
  periodes: { id: number; code: string }[]
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
  REJETEE: { label: 'Rejetée', className: 'bg-red-500/10 text-red-700 dark:text-red-400' },
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

function UserAvatar({ prenom, nom }: { prenom: string; nom: string }) {
  const initials = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()
  return (
    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
      {initials}
    </div>
  )
}

export default function DirecteurRapportUserIdPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getNotation } = useNotationGrille()
  const userId = typeof params.userId === 'string' ? parseInt(params.userId, 10) : NaN
  const periodeIdParam = searchParams.get('periodeId')
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchReport = useCallback(async () => {
    if (Number.isNaN(userId)) return
    setLoading(true)
    const url = periodeIdParam
      ? `/api/directeur/rapports/${userId}?periodeId=${periodeIdParam}`
      : `/api/directeur/rapports/${userId}`
    const res = await fetch(url)
    setLoading(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: err?.error ?? 'Chargement du rapport', variant: 'destructive' })
      setData(null)
      return
    }
    setData(await res.json())
  }, [userId, periodeIdParam])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handlePeriodeChange = (value: string) => {
    const qs = value ? `?periodeId=${value}` : ''
    router.push(`/directeur/rapports/${userId}${qs}`)
  }

  const scoreGlobal = data?.detailPeriode?.scoreGlobal ?? 0
  const details = data?.detailPeriode?.details ?? []
  const comparaison = data?.comparaisonVsPrecedent ?? null
  const evolution = (data?.evolution ?? []).filter((e) => e.scoreGlobal > 0)
  const scoreParMois = useMemo(
    () =>
      (data?.scoreParMois ?? []).map((m) => ({
        ...m,
        score: m.scorePct > 0 ? m.scorePct : null,
      })),
    [data?.scoreParMois]
  )
  const moisPeriode = data?.moisPeriode ?? []
  const kpiParMois = data?.kpiParMois ?? []
  const notationGlobale = scoreGlobal > 0 ? getNotation(scoreGlobal) : null
  const gestionParPoids = details.some((d) => (d.poids ?? 0) > 0)
  const hasMonthlyScores = scoreParMois.some((s) => s.score != null && s.score > 0)
  const hasMonthlyKpiData = kpiParMois.length > 0 && moisPeriode.length > 0

  const scoreParMoisColores = scoreParMois.map((m) => ({
    ...m,
    couleur: m.score != null && m.score > 0 ? getNotation(m.score).chartColor : null,
  }))
  const moisScoresActifs = scoreParMoisColores.filter((m) => m.score != null && m.score > 0)
  const couleurCourbeDebut = moisScoresActifs[0]?.couleur ?? notationGlobale?.chartColor ?? 'hsl(var(--primary))'
  const couleurCourbeFin =
    moisScoresActifs[moisScoresActifs.length - 1]?.couleur ?? couleurCourbeDebut

  if (Number.isNaN(userId)) {
    return (
      <div className="space-y-4 p-4">
        <p className="text-muted-foreground">Identifiant invalide.</p>
        <Button variant="outline" asChild>
          <Link href="/directeur/rapports">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux rapports
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 print:p-4 max-w-6xl mx-auto">
      {/* Barre d'actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link href={periodeIdParam ? `/directeur/rapports?periodeId=${periodeIdParam}` : '/directeur/rapports'}>
            <ArrowLeft className="h-4 w-4" />
            Retour aux rapports
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {data?.periodes?.length ? (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select
                value={String(data.periodeId)}
                onValueChange={handlePeriodeChange}
                disabled={loading}
              >
                <SelectTrigger className="w-[180px] border-0 bg-transparent shadow-none focus:ring-0 h-8">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  {data.periodes.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
            <FileText className="h-4 w-4" />
            Imprimer / PDF
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Chargement du rapport…
          </CardContent>
        </Card>
      ) : !data ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Rapport introuvable.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* En-tête collaborateur */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <UserAvatar prenom={data.user.prenom} nom={data.user.nom} />
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight truncate">
                  {data.user.prenom} {data.user.nom}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <Badge variant="secondary" className="font-normal">
                    {libellerRole(data.user.role)}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {data.user.email}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Rapport de performance —{' '}
                  <Badge variant="outline" className="font-normal ml-1">
                    {data.periodeCode}
                  </Badge>
                </p>
              </div>
            </div>
          </div>

          {/* Synthèse score */}
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
                    <p className="text-sm font-semibold">Score global — {data.periodeCode}</p>
                    {notationGlobale ? (
                      <>
                        <NotationBadge taux={scoreGlobal} showTaux />
                        <div className="rounded-lg border border-border/60 bg-muted/20 p-3 flex gap-2 text-left">
                          <MessageSquareQuote className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {notationGlobale.commentaire}
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Aucune saisie validée sur cette période.
                      </p>
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
            description="Référentiel des appréciations utilisées dans ce rapport"
          />

          {/* Détail KPI */}
          <Card className="border-border/60 shadow-sm overflow-hidden print:break-inside-avoid">
            <CardHeader className="bg-muted/30 border-b py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Détail par KPI
              </CardTitle>
              <CardDescription>Objectifs, réalisations et notation — {data.periodeCode}</CardDescription>
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
                        <TableHead className="min-w-[120px]">Progression</TableHead>
                        <TableHead className="text-right">Taux</TableHead>
                        <TableHead className="min-w-[160px]">Appréciation</TableHead>
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
                            <TableCell className="font-medium text-sm leading-snug whitespace-normal">
                              {d.nom}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-normal text-xs">
                                {TYPE_LABELS[d.type] ?? d.type ?? '—'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{d.cible}</TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{d.realise}</TableCell>
                            {gestionParPoids && (
                              <TableCell className="text-right tabular-nums text-muted-foreground text-sm">
                                {d.poids != null && d.poids > 0 ? `${d.poids}%` : '—'}
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="h-2 min-w-[100px] rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, d.taux)}%`,
                                    backgroundColor: notation.chartColor,
                                  }}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={cn('font-semibold tabular-nums text-sm', notation.textClassName)}>
                                {d.taux.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="align-top">
                              <NotationBadge taux={d.taux} variant="text" />
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

          {/* Réalisations mensuelles */}
          {hasMonthlyKpiData && (
            <Card className="border-border/60 shadow-sm overflow-hidden print:break-inside-avoid">
              <CardHeader className="bg-muted/30 border-b py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Réalisations par mois
                </CardTitle>
                <CardDescription>Détail mensuel par KPI — {data.periodeCode}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="min-w-[160px] sticky left-0 bg-muted/50 z-10">KPI</TableHead>
                        <TableHead className="text-right">Cible</TableHead>
                        {moisPeriode.map((m) => (
                          <TableHead key={m.mois} className="text-right min-w-[72px] text-xs whitespace-nowrap">
                            {m.label}
                          </TableHead>
                        ))}
                        <TableHead className="text-right min-w-[72px]">Global</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kpiParMois.map((k, idx) => {
                        const stripe = idx % 2 === 1
                        const fmt = (v: number | null | undefined) =>
                          v != null ? (Number.isInteger(v) ? String(v) : v.toFixed(1)) : '—'
                        const globalNotation =
                          k.tauxPeriode != null && k.tauxPeriode > 0 ? getNotation(k.tauxPeriode) : null
                        return (
                          <TableRow
                            key={k.kpiEmployeId}
                            className={cn(stripe ? 'bg-muted/40' : '')}
                          >
                            <TableCell
                              className={cn(
                                'font-medium text-sm sticky left-0 z-10',
                                stripe ? 'bg-muted/40' : 'bg-background'
                              )}
                            >
                              {k.nom}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-sm">{fmt(k.cible)}</TableCell>
                            {k.realisations_par_mois.map((r) => {
                              const statut = r.statut ? STATUT_SAISIE_MAP[r.statut] : null
                              const tauxNotation =
                                r.taux != null && r.taux > 0 ? getNotation(r.taux) : null
                              return (
                                <TableCell key={r.mois} className="text-right p-2">
                                  {r.valeur != null ? (
                                    <div className="flex flex-col items-end gap-0.5">
                                      <span className="tabular-nums text-sm">{fmt(r.valeur)}</span>
                                      {tauxNotation && (
                                        <span className={cn('text-[10px] tabular-nums', tauxNotation.textClassName)}>
                                          {r.taux!.toFixed(0)}%
                                        </span>
                                      )}
                                      {statut && r.statut !== 'VALIDEE' && r.statut !== 'AJUSTEE' && (
                                        <Badge variant="outline" className={cn('text-[9px] px-1 py-0', statut.className)}>
                                          {statut.label}
                                        </Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-right">
                              {globalNotation ? (
                                <span className={cn('font-semibold tabular-nums text-sm', globalNotation.textClassName)}>
                                  {k.tauxPeriode!.toFixed(1)}%
                                </span>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {hasMonthlyScores && (
                        <TableRow className="bg-muted/60 font-medium border-t-2">
                          <TableCell className="sticky left-0 bg-muted/60 z-10 text-sm">Score mensuel</TableCell>
                          <TableCell />
                          {scoreParMois.map((s) => {
                            const n = s.score != null && s.score > 0 ? getNotation(s.score) : null
                            return (
                              <TableCell key={s.mois} className="text-right p-2">
                                {n ? (
                                  <span className={cn('tabular-nums text-sm font-semibold', n.textClassName)}>
                                    {s.score!.toFixed(1)}%
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                            )
                          })}
                          <TableCell className="text-right">
                            {notationGlobale ? (
                              <span className={cn('font-semibold tabular-nums text-sm', notationGlobale.textClassName)}>
                                {scoreGlobal.toFixed(1)}%
                              </span>
                            ) : (
                              '—'
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

          {/* Graphiques */}
          <div className="grid gap-4 lg:grid-cols-2 print:break-inside-avoid">
            {hasMonthlyScores && (
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Score par mois
                  </CardTitle>
                  <CardDescription>Histogramme — {data.periodeCode}</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-[240px]">
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
                        <Tooltip
                          formatter={(value: number) => [`${Number(value).toFixed(1)}%`, 'Score']}
                          contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                        />
                        <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeOpacity={0.5} />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
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
                </CardContent>
              </Card>
            )}

            {hasMonthlyScores && scoreParMois.length > 1 && (
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Courbe mensuelle
                  </CardTitle>
                  <CardDescription>Tendance sur la période</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={scoreParMoisColores} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                        <defs>
                          <linearGradient id="rapportCourbeZone" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={couleurCourbeFin} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={couleurCourbeDebut} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis
                          domain={[0, 120]}
                          tickFormatter={(v) => `${v}%`}
                          width={34}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip
                          formatter={(value: number) => [`${Number(value).toFixed(1)}%`, 'Score']}
                          contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                        />
                        <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeOpacity={0.5} />
                        <Area type="monotone" dataKey="score" stroke="none" fill="url(#rapportCourbeZone)" />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke={couleurCourbeFin}
                          strokeWidth={2.5}
                          dot={(props) => {
                            const { cx, cy, index } = props
                            const couleur = scoreParMoisColores[index]?.couleur ?? couleurCourbeFin
                            return (
                              <circle
                                key={index}
                                cx={cx}
                                cy={cy}
                                r={5}
                                fill={couleur}
                                stroke="hsl(var(--background))"
                                strokeWidth={2}
                              />
                            )
                          }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {evolution.length > 1 && (
              <Card className={cn('border-border/60', hasMonthlyScores ? 'lg:col-span-2' : '')}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Évolution par période
                  </CardTitle>
                  <CardDescription>Score global sur les périodes passées</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={evolution} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="code"
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis
                          domain={[0, 120]}
                          tickFormatter={(v) => `${v}%`}
                          width={36}
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip
                          formatter={(value: number) => [`${Number(value).toFixed(1)}%`, 'Score']}
                          labelFormatter={(label) => `Période ${label}`}
                          contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                        />
                        <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeOpacity={0.5} />
                        <Area
                          type="monotone"
                          dataKey="scoreGlobal"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="hsl(var(--primary))"
                          fillOpacity={0.12}
                        />
                        <Line
                          type="monotone"
                          dataKey="scoreGlobal"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2.5}
                          dot={(props) => {
                            const { cx, cy, index } = props
                            const val = evolution[index]?.scoreGlobal ?? 0
                            const color = getNotation(val).chartColor
                            return (
                              <circle
                                key={index}
                                cx={cx}
                                cy={cy}
                                r={5}
                                fill={color}
                                stroke="hsl(var(--background))"
                                strokeWidth={2}
                              />
                            )
                          }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  )
}
