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
import { TrendingUp, BarChart3 } from 'lucide-react'
import {
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

type PeriodeOption = { id: number; code: string }
type DetailRow = { nom: string; type: string; cible: number; realise: number; taux: number; statut: string }
type EvolutionPoint = { periodeId: number; code: string; scoreGlobal: number }
type ScoreMois = { mois: number; annee: number; label: string; scorePct: number }
type ApiResponse = {
  periodeId: number
  periodeCode: string
  detailPeriode: { scoreGlobal: number; details: DetailRow[] }
  comparaisonVsPrecedent: number | null
  evolution: EvolutionPoint[]
  scoreParMois: ScoreMois[]
  periodes: PeriodeOption[]
}

function barColor(score: number): string {
  if (score >= 90) return 'hsl(142 76% 36%)'
  if (score >= 70) return 'hsl(25 95% 53%)'
  return 'hsl(0 84% 60%)'
}

export default function HistoriquePage() {
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
    if (json.periodes?.length > 0 && !periodes.length) {
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

  const selectedPeriodeCode = data?.periodeCode ?? (periodeId && periodes.find((p) => p.id === periodeId)?.code) ?? ''
  const scoreGlobal = data?.detailPeriode?.scoreGlobal ?? 0
  const details = data?.detailPeriode?.details ?? []
  const comparaison = data?.comparaisonVsPrecedent ?? null
  const evolution = data?.evolution ?? []
  const scoreParMois = (data?.scoreParMois ?? []).map((m) => ({ ...m, score: m.scorePct }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon historique</h1>
        <p className="text-muted-foreground">
          Historique de vos objectifs, saisies et validations par période.
        </p>
      </div>

      {/* Sélecteur de période */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Période</CardTitle>
          <CardDescription>Choisir la période à consulter</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : (
            <Select
              value={periodeId != null ? String(periodeId) : 'none'}
              onValueChange={(v) => (v !== 'none' ? setPeriodeId(parseInt(v, 10)) : setPeriodeId(null))}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Sélectionner une période" />
              </SelectTrigger>
              <SelectContent>
                {(data?.periodes ?? periodes).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {loading && data && <p className="text-muted-foreground">Mise à jour...</p>}

      {!loading && data && (
        <>
          {/* Résumé période sélectionnée */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Résumé — {selectedPeriodeCode}</CardTitle>
              <CardDescription>Score global pondéré et comparaison</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-4">
                <span className="text-4xl font-bold">{scoreGlobal.toFixed(1)}%</span>
                {comparaison != null && (
                  <span
                    className={
                      comparaison >= 0 ? 'text-green-600 text-sm' : 'text-red-600 text-sm'
                    }
                  >
                    {comparaison >= 0 ? '+' : ''}{comparaison.toFixed(1)}% vs période précédente
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Détail par KPI */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Détail par KPI</CardTitle>
              <CardDescription>Objectifs et réalisations pour la période</CardDescription>
            </CardHeader>
            <CardContent>
              {details.length === 0 ? (
                <p className="text-muted-foreground py-4">
                  Aucun KPI assigné pour cette période.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom KPI</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Cible</TableHead>
                      <TableHead className="text-right">Réalisé</TableHead>
                      <TableHead className="text-right">Taux %</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{d.nom}</TableCell>
                        <TableCell>{d.type || '—'}</TableCell>
                        <TableCell className="text-right">{d.cible}</TableCell>
                        <TableCell className="text-right">{d.realise}</TableCell>
                        <TableCell className="text-right">{d.taux.toFixed(1)}%</TableCell>
                        <TableCell>{d.statut}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Score par mois (période sélectionnée) */}
          {scoreParMois.length > 0 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5" />
                  Score par mois
                </CardTitle>
                <CardDescription>
                  Répartition mensuelle pour la période {selectedPeriodeCode}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={scoreParMois}
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 120]} tickFormatter={(v) => `${v}%`} width={36} />
                    <Tooltip
                      formatter={(value: number) => [`${Number(value).toFixed(1)}%`, 'Score']}
                      labelFormatter={(label) => label}
                    />
                    <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeOpacity={0.6} />
                    <Bar dataKey="score" name="Score" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {scoreParMois.map((entry, index) => (
                        <Cell key={index} fill={barColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Évolution sur toutes les périodes */}
          {evolution.length > 0 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Évolution du score
                </CardTitle>
                <CardDescription>
                  Score global % par période (chronologique)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={evolution}
                    margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="code" />
                    <YAxis domain={[0, 150]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      formatter={(value: number) => [`${Number(value).toFixed(1)}%`, 'Score']}
                      labelFormatter={(label) => `Période ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="scoreGlobal"
                      name="Score %"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!loading && !data && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucune donnée disponible. Vérifiez vos KPI assignés et vos saisies.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
