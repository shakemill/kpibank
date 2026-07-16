'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
import { Badge } from '@/components/ui/badge'
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
  Users,
  ClipboardList,
  BarChart3,
  Medal,
  ChevronRight,
  CheckCircle2,
  FileCheck,
  FileWarning,
  Target,
} from 'lucide-react'
import { MesKpiPersoSection } from '@/components/dashboard/mes-kpi-perso-section'
import { NotationBadge } from '@/components/notation/NotationBadge'
import { useNotationGrille } from '@/contexts/notation-grille-context'
import { CardsGridSkeleton } from '@/components/card-skeleton'
import { TableSkeleton } from '@/components/table-skeleton'
import { cn } from '@/lib/utils'

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
  scoreDirectionKpis: number
  scoreEmployes: number
  services: ServiceRow[]
  heatmap: { serviceNom: string; kpi: Record<string, number> }[]
  kpiNoms: string[]
  top5: { nom: string; prenom: string; score: number }[]
  bottom5: { nom: string; prenom: string; score: number }[]
  nbSaisiesAValider?: number
  nbSaisiesManquantes?: number
  nbContestations?: number
  nbCollaborateurs?: number
}

function ScoreGauge({
  value,
  color,
  label,
}: {
  value: number
  color: string
  label: string
}) {
  const data = [{ name: label, value: Math.min(100, Math.max(0, value)), fill: color }]
  return (
    <div className="relative w-44 h-32 shrink-0">
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
          <RadialBar
            dataKey="value"
            cornerRadius={10}
            background={{ fill: 'hsl(var(--muted))' }}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-x-0 bottom-4 text-center pointer-events-none">
        <span className="text-2xl font-bold tabular-nums leading-none" style={{ color }}>
          {value.toFixed(0)}
        </span>
        <span className="text-sm text-muted-foreground ml-0.5">%</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-between px-2 text-[10px] text-muted-foreground pointer-events-none">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  )
}

function TendanceBadge({ tendance }: { tendance: number | null }) {
  if (tendance == null) {
    return <span className="text-muted-foreground text-sm">—</span>
  }
  if (tendance > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
        <TrendingUp className="h-3.5 w-3.5" />
        +{tendance.toFixed(1)} pts
      </span>
    )
  }
  if (tendance < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
        <TrendingDown className="h-3.5 w-3.5" />
        {tendance.toFixed(1)} pts
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <Minus className="h-3.5 w-3.5" />
      Stable
    </span>
  )
}

function RankBadge({ rank }: { rank: number }) {
  const styles =
    rank === 1
      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-amber-500/30'
      : rank === 2
        ? 'bg-slate-400/15 text-slate-600 dark:text-slate-300 ring-slate-400/30'
        : rank === 3
          ? 'bg-orange-600/15 text-orange-700 dark:text-orange-400 ring-orange-600/30'
          : 'bg-muted text-muted-foreground ring-border'
  return (
    <span
      className={cn(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1',
        styles
      )}
    >
      {rank}
    </span>
  )
}

export default function DashboardDirecteurPage() {
  const { getNotation } = useNotationGrille()
  const [mounted, setMounted] = useState(false)
  const [periodes, setPeriodes] = useState<Periode[]>([])
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [data, setData] = useState<DirecteurData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadPeriodes() {
      const res = await fetch('/api/periodes')
      if (cancelled || !res.ok) return
      const list = await res.json()
      setPeriodes(list)
      const enCours = list.find((p: Periode) => p.statut === 'EN_COURS')
      if (list.length > 0) {
        setPeriodeId(enCours ? enCours.id : list[0].id)
      }
    }
    loadPeriodes()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (periodeId == null) return
    let cancelled = false
    async function loadDashboard() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/dashboard/directeur?periodeId=${periodeId}`)
        if (cancelled) return
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          setError(err?.error ?? 'Erreur chargement')
          setData(null)
          return
        }
        const json = await res.json()
        setData(json)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadDashboard()
    return () => { cancelled = true }
  }, [periodeId])

  const periodeCode = periodes.find((p) => p.id === periodeId)?.code ?? ''
  const notationDirection = data ? getNotation(data.scoreDirectionKpis ?? 0) : null
  const notationEmployes = data ? getNotation(data.scoreEmployes ?? 0) : null
  const totalEmployes = data?.services.reduce((s, svc) => s + svc.nbEmployes, 0) ?? 0

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
        <Card className="border-destructive/30">
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
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-primary/10 flex items-center justify-center shadow-sm">
            <LayoutDashboard className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tableau de bord Directeur</h1>
            <p className="text-muted-foreground text-sm">
              Performance de la direction et des services
              {periodeCode && (
                <Badge variant="outline" className="ml-2 font-normal">
                  {periodeCode}
                </Badge>
              )}
            </p>
          </div>
        </div>
        {mounted ? (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select
              value={periodeId?.toString() ?? ''}
              onValueChange={(v) => setPeriodeId(v ? parseInt(v, 10) : null)}
              disabled={loading}
            >
              <SelectTrigger className="w-[200px] border-0 bg-transparent shadow-none focus:ring-0">
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
          <div className="h-10 w-[240px] rounded-lg border border-input bg-muted/50" aria-hidden />
        )}
      </div>

      {data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/manager/validation">
            <Card
              className={cn(
                'group h-full border-border/60 hover:shadow-md transition-all cursor-pointer',
                (data.nbSaisiesAValider ?? 0) > 0
                  ? 'border-amber-500/40 hover:border-amber-500/60 bg-amber-500/5'
                  : 'hover:border-emerald-500/40'
              )}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/15 transition-colors">
                    <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  {(data.nbSaisiesAValider ?? 0) > 0 && (
                    <Badge className="bg-amber-500 text-white hover:bg-amber-500 shrink-0">
                      {data.nbSaisiesAValider}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-semibold mt-3">Valider les saisies</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(data.nbSaisiesAValider ?? 0) > 0
                    ? `${data.nbSaisiesAValider} saisie(s) en attente ce mois`
                    : 'Toutes les saisies du mois sont traitées'}
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-2 group-hover:underline">
                  Ouvrir la validation
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/manager/equipe">
            <Card className="group h-full border-border/60 hover:border-blue-500/40 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="pt-5 pb-4">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/15 transition-colors">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-semibold mt-3">Mon équipe</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.nbCollaborateurs ?? totalEmployes} collaborateur(s) sous votre direction
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-2 group-hover:underline">
                  Voir l&apos;équipe
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/manager/assignation">
            <Card className="group h-full border-border/60 hover:border-violet-500/40 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="pt-5 pb-4">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0 group-hover:bg-violet-500/15 transition-colors">
                  <ClipboardList className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-sm font-semibold mt-3">Assignations KPI</p>
                <p className="text-xs text-muted-foreground mt-1">Gérer les objectifs des collaborateurs</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-2 group-hover:underline">
                  Gérer les assignations
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>

          <Link href="/directeur/rapports">
            <Card className="group h-full border-border/60 hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="pt-5 pb-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/15 transition-colors">
                  <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-semibold mt-3">Rapports collaborateurs</p>
                <p className="text-xs text-muted-foreground mt-1">Performance détaillée par personne</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary mt-2 group-hover:underline">
                  Consulter les rapports
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {!loading && data && ((data.nbSaisiesAValider ?? 0) > 0 || (data.nbSaisiesManquantes ?? 0) > 0) && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-5 pb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <FileCheck className="h-3.5 w-3.5" />
                  À valider ce mois
                </p>
                <p className="text-3xl font-bold tabular-nums mt-1">{data.nbSaisiesAValider ?? 0}</p>
              </div>
              <Button size="sm" asChild>
                <Link href="/manager/validation">Valider</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-5 pb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <FileWarning className="h-3.5 w-3.5" />
                  Saisies manquantes
                </p>
                <p className="text-3xl font-bold tabular-nums mt-1">{data.nbSaisiesManquantes ?? 0}</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/manager/validation">Relancer</Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-5 pb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Contestations
                </p>
                <p className="text-3xl font-bold tabular-nums mt-1">{data.nbContestations ?? 0}</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/manager/assignation/contestations">Voir</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Séparateur vue direction */}
      <div className="relative pt-2">
        <div className="absolute inset-x-0 top-0 h-px bg-border" />
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Performance de la direction</h2>
              <p className="text-sm text-muted-foreground">Vue consolidée des services et collaborateurs</p>
            </div>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <>
          <CardsGridSkeleton count={3} />
          <div className="grid gap-4 sm:grid-cols-2">
            <CardSkeletonGauge />
            <CardSkeletonGauge />
          </div>
          <Card>
            <CardHeader>
              <div className="h-5 w-48 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={5} cols={4} />
            </CardContent>
          </Card>
        </>
      ) : data ? (
        <>
          {/* Accès rapides direction */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/directeur/saisie">
              <Card className="group h-full border-border/60 hover:border-violet-500/40 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="pt-5 pb-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0 group-hover:bg-violet-500/15 transition-colors">
                    <ClipboardList className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Saisie KPI direction</p>
                    <p className="text-xs text-muted-foreground truncate">Indicateurs d&apos;entité</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </CardContent>
              </Card>
            </Link>
            <Link href="/manager/validation">
              <Card className="group h-full border-border/60 hover:border-amber-500/40 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="pt-5 pb-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/15 transition-colors">
                    <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Validation saisies</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {(data.nbSaisiesAValider ?? 0) > 0
                        ? `${data.nbSaisiesAValider} en attente`
                        : 'Équipe à jour'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </CardContent>
              </Card>
            </Link>
            <Link href="/directeur/rapports">
              <Card className="group h-full border-border/60 hover:border-blue-500/40 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="pt-5 pb-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/15 transition-colors">
                    <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Rapports</p>
                    <p className="text-xs text-muted-foreground truncate">Suivi par collaborateur</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </CardContent>
              </Card>
            </Link>
            <Link href="/directeur/services">
              <Card className="group h-full border-border/60 hover:border-emerald-500/40 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="pt-5 pb-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/15 transition-colors">
                    <Briefcase className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Services & départements</p>
                    <p className="text-xs text-muted-foreground truncate">{data.services.length} service(s)</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* KPI synthèse */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-border/60">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Services</p>
                    <p className="text-3xl font-bold tabular-nums mt-1">{data.services.length}</p>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Collaborateurs</p>
                    <p className="text-3xl font-bold tabular-nums mt-1">{totalEmployes}</p>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Écart scores</p>
                    <p className={cn(
                      'text-3xl font-bold tabular-nums mt-1',
                      Math.abs((data.scoreDirectionKpis ?? 0) - (data.scoreEmployes ?? 0)) > 10
                        ? 'text-amber-600 dark:text-amber-400'
                        : ''
                    )}>
                      {Math.abs((data.scoreDirectionKpis ?? 0) - (data.scoreEmployes ?? 0)).toFixed(0)} pts
                    </p>
                  </div>
                  <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Gauge className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Direction vs staff</p>
              </CardContent>
            </Card>
          </div>

          {/* Scores direction / staff */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card
              className="overflow-hidden border-border/60"
              style={{ borderColor: notationDirection ? `${notationDirection.chartColor}30` : undefined }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Gauge className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">KPI entité direction</CardTitle>
                    <CardDescription>Saisies des indicateurs d&apos;entité</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="flex flex-col sm:flex-row items-center gap-6 rounded-xl p-4"
                  style={{
                    background: notationDirection
                      ? `linear-gradient(135deg, ${notationDirection.chartColor}12 0%, transparent 70%)`
                      : undefined,
                  }}
                >
                  <ScoreGauge
                    value={data.scoreDirectionKpis ?? 0}
                    color={notationDirection?.chartColor ?? '#8b5cf6'}
                    label="Direction"
                  />
                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    {notationDirection && (
                      <>
                        <NotationBadge taux={data.scoreDirectionKpis ?? 0} showTaux showCommentaire />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {notationDirection.commentaire}
                        </p>
                      </>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5" asChild>
                      <Link href="/directeur/saisie">
                        <ClipboardList className="h-3.5 w-3.5" />
                        Saisir les KPI
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="overflow-hidden border-border/60"
              style={{ borderColor: notationEmployes ? `${notationEmployes.chartColor}30` : undefined }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Moyenne départements / agences</CardTitle>
                    <CardDescription>Score moyen du staff de la direction</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="flex flex-col sm:flex-row items-center gap-6 rounded-xl p-4"
                  style={{
                    background: notationEmployes
                      ? `linear-gradient(135deg, ${notationEmployes.chartColor}12 0%, transparent 70%)`
                      : undefined,
                  }}
                >
                  <ScoreGauge
                    value={data.scoreEmployes ?? 0}
                    color={notationEmployes?.chartColor ?? '#3b82f6'}
                    label="Staff"
                  />
                  <div className="flex-1 space-y-3 text-center sm:text-left">
                    {notationEmployes && (
                      <>
                        <NotationBadge taux={data.scoreEmployes ?? 0} showTaux showCommentaire />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {notationEmployes.commentaire}
                        </p>
                      </>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5" asChild>
                      <Link href="/manager/validation">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Valider les saisies
                        {(data.nbSaisiesAValider ?? 0) > 0 && (
                          <Badge variant="secondary" className="ml-1 font-normal">
                            {data.nbSaisiesAValider}
                          </Badge>
                        )}
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" asChild>
                      <Link href="/directeur/rapports">
                        <BarChart3 className="h-3.5 w-3.5" />
                        Voir les rapports
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance par service */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="bg-muted/30 border-b">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Performance par service</CardTitle>
                  <CardDescription>Taux d&apos;atteinte, effectif et tendance vs période précédente</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                          Service
                        </span>
                      </TableHead>
                      <TableHead className="min-w-[160px]">Progression</TableHead>
                      <TableHead className="text-right">Taux</TableHead>
                      <TableHead className="text-right">
                        <span className="flex items-center justify-end gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          Effectif
                        </span>
                      </TableHead>
                      <TableHead className="text-right">Tendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.services.map((s, idx) => {
                      const notation = getNotation(s.tauxAtteinte)
                      const stripe = idx % 2 === 1
                      return (
                        <TableRow
                          key={s.serviceId}
                          className={cn(stripe ? 'bg-muted/40 hover:bg-muted/55' : 'hover:bg-muted/25')}
                        >
                          <TableCell className="font-medium">{s.serviceNom}</TableCell>
                          <TableCell>
                            <div className="h-2 min-w-[140px] rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, s.tauxAtteinte)}%`,
                                  backgroundColor: notation.chartColor,
                                }}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={cn('font-semibold tabular-nums', notation.textClassName)}>
                              {s.tauxAtteinte.toFixed(0)} %
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <Badge variant="secondary" className="font-normal">
                              {s.nbEmployes}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <TendanceBadge tendance={s.tendance} />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {data.services.length === 0 && (
                <p className="text-muted-foreground text-sm py-6 text-center">Aucun service rattaché à cette direction.</p>
              )}
            </CardContent>
          </Card>

          {/* Heatmap */}
          {data.heatmap?.length > 0 && data.kpiNoms?.length > 0 && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="bg-muted/30 border-b">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <LayoutGrid className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Heatmap Services × KPI</CardTitle>
                      <CardDescription>Taux d&apos;atteinte par service et par indicateur</CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    {['Critique', 'Insuffisant', 'Satisfaisant', 'Bon', 'Excellent'].map((l, i) => {
                      const sampleTaux = [40, 70, 85, 95, 105][i]
                      const n = getNotation(sampleTaux)
                      return (
                        <span
                          key={l}
                          className={cn('rounded px-1.5 py-0.5 font-medium', n.heatmapClassName)}
                        >
                          {l}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="min-w-[140px] sticky left-0 bg-muted/50 z-10">Service</TableHead>
                        {data.kpiNoms.map((k) => (
                          <TableHead key={k} className="text-center min-w-[88px] text-xs whitespace-normal">
                            {k}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.heatmap.map((row, idx) => {
                        const stripe = idx % 2 === 1
                        return (
                          <TableRow
                            key={row.serviceNom}
                            className={cn('group', stripe ? 'bg-muted/40 hover:bg-muted/55' : 'hover:bg-muted/25')}
                          >
                            <TableCell
                              className={cn(
                                'font-medium sticky left-0 z-10 transition-colors',
                                stripe ? 'bg-muted/40 group-hover:bg-muted/55' : 'bg-background group-hover:bg-muted/25'
                              )}
                            >
                              {row.serviceNom}
                            </TableCell>
                            {data.kpiNoms.map((k) => {
                              const val = row.kpi[k] ?? 0
                              const notation = getNotation(val)
                              return (
                                <TableCell
                                  key={k}
                                  className={cn('text-center font-medium tabular-nums text-sm', notation.heatmapClassName)}
                                >
                                  {row.kpi[k] != null ? `${Math.round(row.kpi[k])} %` : '—'}
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top / Bottom 5 */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/60 overflow-hidden">
              <CardHeader className="bg-green-500/5 border-b border-green-500/10">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5 text-green-600 dark:text-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      Top 5 performers
                      <Medal className="h-4 w-4 text-amber-500" />
                    </CardTitle>
                    <CardDescription>Meilleurs scores (≥ 50 %) de la direction</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-2">
                  {data.top5.map((e, i) => (
                      <li
                        key={`${e.prenom}-${e.nom}-${i}`}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm',
                          i % 2 === 1 ? 'bg-muted/40' : 'bg-muted/20'
                        )}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <RankBadge rank={i + 1} />
                          <span className="truncate font-medium">
                            {e.prenom} {e.nom}
                          </span>
                        </span>
                        <NotationBadge taux={e.score} showTaux variant="badge" />
                      </li>
                  ))}
                </ul>
                {data.top5.length === 0 && (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    Aucun collaborateur avec un score ≥ 50 % sur cette période.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 overflow-hidden">
              <CardHeader className="bg-orange-500/5 border-b border-orange-500/10">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {data.bottom5.length > 0
                        ? `${data.bottom5.length} en difficulté`
                        : 'En difficulté'}
                    </CardTitle>
                    <CardDescription>Collaborateurs à accompagner en priorité (&lt; 50 %)</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ul className="space-y-2">
                  {data.bottom5.map((e, i) => (
                    <li
                      key={`${e.prenom}-${e.nom}-${i}`}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm',
                        i % 2 === 1 ? 'bg-muted/40' : 'bg-muted/20'
                      )}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-xs font-bold text-orange-700 dark:text-orange-400">
                          {i + 1}
                        </span>
                        <span className="truncate font-medium">
                          {e.prenom} {e.nom}
                        </span>
                      </span>
                      <NotationBadge taux={e.score} showTaux variant="badge" />
                    </li>
                  ))}
                </ul>
                {data.bottom5.length === 0 && (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    Aucun collaborateur en difficulté (&lt; 50 %) sur cette période.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="relative pt-2">
            <div className="absolute inset-x-0 top-0 h-px bg-border" />
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-500/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Évaluation personnelle</h2>
                  <p className="text-sm text-muted-foreground">
                    Vos KPI individuels, distincts du pilotage de la direction
                  </p>
                </div>
              </div>
            </div>
          </div>

          <MesKpiPersoSection
            sectionTitle="Mes KPI individuels"
            sectionHint="Objectifs assignés en tant que collaborateur. Saisie mensuelle classique — distincts des KPI entité direction."
            assigneParLabel="le DG"
            lienDetail="/employe/mes-kpi"
            variant="secondary"
          />
        </>
      ) : null}
    </div>
  )
}

function CardSkeletonGauge() {
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-6">
        <div className="h-32 w-44 rounded-full bg-muted animate-pulse shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-8 w-28 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}
