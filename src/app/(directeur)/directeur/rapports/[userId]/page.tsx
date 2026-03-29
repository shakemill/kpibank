'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts'
import { FileText, ArrowLeft, TrendingUp, BarChart3, Target } from 'lucide-react'

function barColor(score: number): string {
  if (score >= 90) return 'hsl(142 76% 36%)' // green
  if (score >= 70) return 'hsl(25 95% 53%)'  // orange
  return 'hsl(0 84% 60%)' // red
}

type DetailRow = { nom: string; type: string; cible: number; realise: number; taux: number; statut: string }
type EvolutionPoint = { periodeId: number; code: string; scoreGlobal: number }
type ScoreMois = { mois: number; annee: number; label: string; scorePct: number }
type ReportData = {
  user: { id: number; nom: string; prenom: string; email: string; role: string }
  periodeId: number
  periodeCode: string
  detailPeriode: { scoreGlobal: number; details: DetailRow[] }
  comparaisonVsPrecedent: number | null
  evolution: EvolutionPoint[]
  scoreParMois: ScoreMois[]
  periodes: { id: number; code: string }[]
}

export default function DirecteurRapportUserIdPage() {
  const params = useParams()
  const searchParams = useSearchParams()
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
      return
    }
    const json = await res.json()
    setData(json)
  }, [userId, periodeIdParam])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  if (Number.isNaN(userId)) {
    return (
      <div className="space-y-6 p-6">
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

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <p className="text-muted-foreground">Chargement du rapport...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6 p-6">
        <p className="text-muted-foreground">Rapport introuvable.</p>
        <Button variant="outline" asChild>
          <Link href="/directeur/rapports">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux rapports
          </Link>
        </Button>
      </div>
    )
  }

  const scoreGlobal = data.detailPeriode?.scoreGlobal ?? 0
  const evolutionData = data.evolution ?? []
  const scoreParMoisData = (data.scoreParMois ?? []).map((m) => ({ ...m, score: m.scorePct }))

  return (
    <div className="space-y-8 p-6 print:p-4 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 print:block">
        <Button variant="ghost" size="sm" className="gap-2 print:hidden" asChild>
          <Link href="/directeur/rapports">
            <ArrowLeft className="h-4 w-4" />
            Retour aux rapports
          </Link>
        </Button>
        <Button variant="outline" className="gap-2 print:hidden" onClick={handlePrint}>
          <FileText className="h-4 w-4" />
          Imprimer / Enregistrer en PDF
        </Button>
      </div>

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rapport de performance</h1>
        <p className="text-muted-foreground mt-1">
          {data.user.prenom} {data.user.nom} — Période {data.periodeCode}
        </p>
      </div>

      {/* Score global — bloc visuel */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 print:border print:bg-transparent">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex items-baseline gap-4 flex-wrap">
              <span className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight">
                {scoreGlobal.toFixed(1)}%
              </span>
              <span className="text-muted-foreground text-sm sm:text-base">Score global</span>
            </div>
            {data.comparaisonVsPrecedent != null && (
              <span
                className={
                  data.comparaisonVsPrecedent >= 0
                    ? 'inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-400'
                    : 'inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400'
                }
              >
                <TrendingUp className="h-4 w-4" />
                {data.comparaisonVsPrecedent >= 0 ? '+' : ''}
                {data.comparaisonVsPrecedent.toFixed(1)}% vs période précédente
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Détail par KPI */}
      {data.detailPeriode?.details?.length > 0 && (
        <Card className="print:border print:shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Détail par KPI
            </CardTitle>
            <CardDescription>Objectifs et réalisations pour la période</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-medium">KPI</TableHead>
                  <TableHead className="text-right">Cible</TableHead>
                  <TableHead className="text-right">Réalisé</TableHead>
                  <TableHead className="text-right w-24">Taux</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.detailPeriode.details.map((d, i) => (
                  <TableRow key={i} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                    <TableCell className="font-medium">{d.nom}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.cible}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.realise}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          d.taux >= 90
                            ? 'font-medium text-green-600 dark:text-green-400'
                            : d.taux >= 70
                              ? 'font-medium text-orange-600 dark:text-orange-400'
                              : 'font-medium text-red-600 dark:text-red-400'
                        }
                      >
                        {d.taux.toFixed(1)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Évolution du score par période */}
      {evolutionData.length > 0 && (
        <Card className="print:break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Évolution du score par période
            </CardTitle>
            <CardDescription>Score global sur les périodes passées</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={evolutionData}
                margin={{ top: 12, right: 20, left: 0, bottom: 8 }}
              >
                <defs>
                  <linearGradient id="evolutionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="code"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 150]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  formatter={(value: number) => [`${Number(value).toFixed(1)}%`, 'Score']}
                  labelFormatter={(label) => `Période ${label}`}
                  cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '3 3' }}
                />
                <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeOpacity={0.6} />
                <Area
                  type="monotone"
                  dataKey="scoreGlobal"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#evolutionGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="scoreGlobal"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Score par mois */}
      {scoreParMoisData.length > 0 && (
        <Card className="print:break-inside-avoid">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Score par mois
            </CardTitle>
            <CardDescription>Répartition mensuelle sur la période {data.periodeCode}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={scoreParMoisData}
                margin={{ top: 12, right: 20, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 120]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  formatter={(value: number) => [`${Number(value).toFixed(1)}%`, 'Score']}
                  labelFormatter={(label) => label}
                  cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.2 }}
                />
                <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeOpacity={0.6} />
                <Bar dataKey="score" name="Score" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {scoreParMoisData.map((entry, index) => (
                    <Cell key={index} fill={barColor(entry.score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
