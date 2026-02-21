'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { ChartContainer } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import { AlertCircle, FileCheck, FileWarning, Users } from 'lucide-react'
import { TableSkeleton } from '@/components/table-skeleton'
import { CardsGridSkeleton } from '@/components/card-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { MesKpiPersoSection } from '@/components/dashboard/mes-kpi-perso-section'

type Periode = { id: number; code: string; statut: string }
type EmployeRow = {
  id: number
  nom: string
  prenom: string
  scoreGlobal: number
  nbKpiValides: number
  nbKpiTotal: number
  saisieMoisCourant: 'Soumise' | 'Validée' | 'Non soumise' | 'N/A'
}
type ManagerData = {
  periodeId: number
  employes: EmployeRow[]
  nbSaisiesAValider: number
  nbContestations: number
  nbSaisiesManquantes: number
  chartData: Record<string, string | number>[]
  kpiNoms: string[]
}

function scoreRowClass(score: number): string {
  if (score < 70) return 'text-red-600 dark:text-red-400 font-medium'
  if (score < 90) return 'text-orange-600 dark:text-orange-400 font-medium'
  return 'text-green-600 dark:text-green-400 font-medium'
}

export default function DashboardManagerPage() {
  const [mounted, setMounted] = useState(false)
  const [periodes, setPeriodes] = useState<Periode[]>([])
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [data, setData] = useState<ManagerData | null>(null)
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
      const res = await fetch(`/api/dashboard/manager?periodeId=${periodeId}`)
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

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Tableau de bord Manager</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord Manager</h1>
          <p className="text-muted-foreground">Équipe, validations et performance.</p>
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

      {/* Section "Mes KPI Personnels" (assignés par Chef de Service) */}
      <MesKpiPersoSection assigneParLabel="votre Chef de service" />

      {loading && !data ? (
        <>
          <CardsGridSkeleton count={3} />
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={6} cols={5} />
            </CardContent>
          </Card>
        </>
      ) : data ? (
        <>
          {/* Section 2 — Actions requises (alertes en haut pour visibilité) */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Saisies à valider</CardTitle>
                <FileCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.nbSaisiesAValider}</div>
                <Link href="/manager/validation">
                  <Button variant="link" className="px-0 text-sm">Voir les saisies à valider</Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Contestations</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.nbContestations}</div>
                <p className="text-xs text-muted-foreground">En attente de réponse</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Saisies manquantes</CardTitle>
                <FileWarning className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.nbSaisiesManquantes}</div>
                <Link href="/manager/validation">
                  <Button variant="link" className="px-0 text-sm">Voir les manquantes</Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Section 1 — Vue équipe */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Vue équipe
              </CardTitle>
              <CardDescription>Score, KPI validés et statut de saisie du mois en cours</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead className="text-right">Score global %</TableHead>
                    <TableHead className="text-right">KPI validés / total</TableHead>
                    <TableHead>Saisie mois en cours</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.employes.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.nom} {e.prenom}</TableCell>
                      <TableCell className={`text-right ${scoreRowClass(e.scoreGlobal)}`}>
                        {e.scoreGlobal.toFixed(0)} %
                      </TableCell>
                      <TableCell className="text-right">
                        {e.nbKpiValides} / {e.nbKpiTotal}
                      </TableCell>
                      <TableCell>{e.saisieMoisCourant}</TableCell>
                      <TableCell>
                        {e.saisieMoisCourant === 'Soumise' && (
                          <Link href="/manager/validation">
                            <Button size="sm" variant="outline">Valider</Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.employes.length === 0 && (
                <p className="text-muted-foreground text-sm py-4">Aucun collaborateur dans votre équipe.</p>
              )}
            </CardContent>
          </Card>

          {/* Section 3 — Performance service (BarChart) */}
          {data.chartData?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Performance par employé et par KPI</CardTitle>
                <CardDescription>Taux d&apos;atteinte par KPI pour chaque membre de l&apos;équipe</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={data.kpiNoms.reduce((acc, k, i) => {
                    const colors = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899']
                    return { ...acc, [k]: { label: k, color: colors[i % colors.length] } }
                  }, {} as Record<string, { label: string; color: string }>)}
                  className="h-[350px] w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.chartData}
                      margin={{ top: 12, right: 12, left: 12, bottom: 12 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 150]} />
                      <YAxis type="category" dataKey="employe" width={120} />
                      <Legend />
                      {data.kpiNoms.map((k, i) => {
                        const colors = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899']
                        return (
                          <Bar
                            key={k}
                            dataKey={k}
                            fill={colors[i % colors.length]}
                            name={k}
                            radius={[0, 4, 4, 0]}
                          />
                        )
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}
