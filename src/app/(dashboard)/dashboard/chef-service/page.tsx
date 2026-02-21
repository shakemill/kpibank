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
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
import {
  Target,
  ClipboardList,
  AlertTriangle,
  Users,
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Scale,
  Building2,
} from 'lucide-react'
import { MesKpiPersoSection } from '@/components/dashboard/mes-kpi-perso-section'

type Periode = { id: number; code: string; statut: string }
type KpiPersoDetail = { nom: string; cible: number; valeurAgregee: number; tauxAtteinte: number; poids: number }
type KpiServiceRow = { id: number; nom: string; unite: string | null; cible: number; realise: number; taux: number }
type EquipeRow = {
  id: number
  nom: string
  prenom: string
  role: string
  score: number
  saisieMoisCourant: 'Soumise' | 'Validée' | 'Non soumise' | 'N/A'
  statut: string
}
type ContributionDir = { kpiNom: string; directionNom: string; contributionPct: number }
type ChefServiceData = {
  serviceNom: string
  directionNom: string
  periodeId: number
  periodeCode: string
  kpiPersonnels: { scoreGlobal: number; details: KpiPersoDetail[] }
  scoreService: number
  comparaisonVsPrecedent: number | null
  kpiService: KpiServiceRow[]
  equipe: EquipeRow[]
  actionsRequises: {
    nbSaisiesEnAttenteValidation: number
    nbKpiServicePoidsIncomplet: number
    nbContestationsEnCours: number
  }
  contributionDirection: ContributionDir[]
  saisieMoisNonSoumiseChef: boolean
}

function tauxColor(taux: number): string {
  if (taux < 70) return 'text-red-600 dark:text-red-400'
  if (taux < 90) return 'text-orange-600 dark:text-orange-400'
  if (taux < 100) return 'text-green-600 dark:text-green-400'
  return 'text-blue-600 dark:text-blue-400'
}
function progressBarClass(taux: number): string {
  if (taux < 70) return '[&_[data-slot=progress-indicator]]:!bg-red-500'
  if (taux < 90) return '[&_[data-slot=progress-indicator]]:!bg-orange-500'
  if (taux < 100) return '[&_[data-slot=progress-indicator]]:!bg-green-500'
  return '[&_[data-slot=progress-indicator]]:!bg-blue-500'
}

export default function DashboardChefServicePage() {
  const [mounted, setMounted] = useState(false)
  const [periodes, setPeriodes] = useState<Periode[]>([])
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [data, setData] = useState<ChefServiceData | null>(null)
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
      const res = await fetch(`/api/dashboard/chef-service?periodeId=${periodeId}`)
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
        <h1 className="text-2xl font-bold">Tableau de bord Chef de service</h1>
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
          <h1 className="text-2xl font-bold">Tableau de bord Chef de service</h1>
          <p className="text-muted-foreground">Mes KPI personnels, mon service et mon équipe.</p>
        </div>
        {mounted && (
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
        )}
      </div>

      {/* Section 1 — Mes KPI Personnels */}
      <MesKpiPersoSection assigneParLabel="votre Directeur" lienSaisie="/saisie" />

      {loading && !data ? (
        <Card><CardContent className="pt-6">Chargement…</CardContent></Card>
      ) : data ? (
        <>
          {/* Bandeau alerte saisie du mois non soumise */}
          {data.saisieMoisNonSoumiseChef && (
            <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>Vous n&apos;avez pas encore soumis votre saisie du mois en cours.</span>
                <Link href="/saisie">
                  <Button size="sm">Saisir mes réalisations</Button>
                </Link>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section 2 — Performance du service */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Performance de mon service
                  </CardTitle>
                  <CardDescription>
                    {data.serviceNom} — Période {data.periodeCode}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        innerRadius="70%"
                        outerRadius="100%"
                        data={[{ name: 'Service', value: Math.min(100, Math.round(data.scoreService)), fill: '#3b82f6' }]}
                        startAngle={180}
                        endAngle={0}
                      >
                        <RadialBar dataKey="value" cornerRadius={8} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="text-center -mt-16 text-xl font-bold">
                      {data.scoreService.toFixed(0)} %
                    </div>
                  </div>
                  <div className="flex-1">
                    {data.comparaisonVsPrecedent != null && (
                      <p className="flex items-center gap-2 text-sm">
                        {data.comparaisonVsPrecedent > 0 && (
                          <>
                            <ArrowRight className="h-4 w-4 text-green-600" />
                            +{data.comparaisonVsPrecedent.toFixed(1)} pts vs période précédente
                          </>
                        )}
                        {data.comparaisonVsPrecedent < 0 && (
                          <>
                            <ArrowRight className="h-4 w-4 text-red-600 rotate-180" />
                            {data.comparaisonVsPrecedent.toFixed(1)} pts vs période précédente
                          </>
                        )}
                        {data.comparaisonVsPrecedent === 0 && (
                          <span className="text-muted-foreground">Identique à la période précédente</span>
                        )}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Section 3 — Mes KPI Service */}
              <Card>
                <CardHeader>
                  <CardTitle>Mes KPI Service</CardTitle>
                  <CardDescription>Cibles, réalisé et taux d&apos;atteinte</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom KPI</TableHead>
                        <TableHead className="text-right">Cible</TableHead>
                        <TableHead className="text-right">Réalisé</TableHead>
                        <TableHead className="text-right">Taux %</TableHead>
                        <TableHead className="w-[140px]">Progression</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.kpiService.map((k) => (
                        <TableRow key={k.id}>
                          <TableCell className="font-medium">{k.nom}</TableCell>
                          <TableCell className="text-right">{k.cible}{k.unite ? ` ${k.unite}` : ''}</TableCell>
                          <TableCell className="text-right">{k.realise.toFixed(2)}{k.unite ? ` ${k.unite}` : ''}</TableCell>
                          <TableCell className={`text-right font-medium ${tauxColor(k.taux)}`}>
                            {k.taux.toFixed(0)} %
                          </TableCell>
                          <TableCell>
                            <Progress value={Math.min(120, k.taux)} className={`h-2 ${progressBarClass(k.taux)}`} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {data.kpiService.length === 0 && (
                    <p className="text-muted-foreground text-sm py-4">Aucun KPI service pour cette période.</p>
                  )}
                  <div className="mt-4">
                    <Link href="/chef-service/kpi-service">
                      <Button variant="outline" size="sm">Gérer</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Section 4 — Mon équipe */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Mon équipe
                  </CardTitle>
                  <CardDescription>Managers et employés du service</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead className="text-right">Score %</TableHead>
                        <TableHead>Saisie mois en cours</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.equipe.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.prenom} {e.nom}</TableCell>
                          <TableCell>
                            <Badge variant={e.role === 'MANAGER' ? 'default' : 'secondary'} className={e.role === 'MANAGER' ? 'bg-blue-600' : ''}>
                              {e.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{e.score.toFixed(0)} %</TableCell>
                          <TableCell>{e.saisieMoisCourant}</TableCell>
                          <TableCell>
                            {e.saisieMoisCourant === 'Non soumise' && (
                              <span className="text-amber-600 text-sm">Saisie manquante</span>
                            )}
                            {e.saisieMoisCourant !== 'Non soumise' && e.statut}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {data.equipe.length === 0 && (
                    <p className="text-muted-foreground text-sm py-4">Aucun collaborateur dans ce service.</p>
                  )}
                </CardContent>
              </Card>

              {/* Section 6 — Contribution à la direction */}
              {data.contributionDirection.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Contribution à la direction</CardTitle>
                    <CardDescription>Votre service contribue aux KPI de la direction</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {data.contributionDirection.map((c, i) => (
                      <div key={i} className="space-y-2">
                        <p className="text-sm">
                          Votre service contribue à <strong>{c.contributionPct.toFixed(0)} %</strong> du KPI &quot;{c.kpiNom}&quot; de la Direction {c.directionNom}.
                        </p>
                        <Progress value={Math.min(100, c.contributionPct)} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Colonne droite — Actions requises */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Actions requises</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.actionsRequises.nbSaisiesEnAttenteValidation > 0 && (
                    <Link href="/manager/validation">
                      <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                        <CheckCircle2 className="h-4 w-4" />
                        {data.actionsRequises.nbSaisiesEnAttenteValidation} saisie(s) en attente de validation
                      </Button>
                    </Link>
                  )}
                  {data.actionsRequises.nbKpiServicePoidsIncomplet > 0 && (
                    <Link href="/chef-service/kpi-service">
                      <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                        <Scale className="h-4 w-4" />
                        KPI service : poids à compléter (≠ 100 %)
                      </Button>
                    </Link>
                  )}
                  {data.actionsRequises.nbContestationsEnCours > 0 && (
                    <Link href="/manager/assignation/contestations">
                      <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                        <AlertCircle className="h-4 w-4" />
                        {data.actionsRequises.nbContestationsEnCours} contestation(s) en cours
                      </Button>
                    </Link>
                  )}
                  {data.actionsRequises.nbSaisiesEnAttenteValidation === 0 &&
                    data.actionsRequises.nbKpiServicePoidsIncomplet === 0 &&
                    data.actionsRequises.nbContestationsEnCours === 0 && (
                      <p className="text-muted-foreground text-sm">Aucune action requise.</p>
                    )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
