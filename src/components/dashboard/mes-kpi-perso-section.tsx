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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Target, AlertTriangle, ClipboardList, BarChart3, Star, TrendingUp } from 'lucide-react'

type KpiPersoItem = {
  id: number
  nom: string
  type: string
  unite: string | null
  cible: number
  poids: number
  statut: string
  periode: { id: number; code: string; statut: string; date_limite_saisie?: string | null }
  assignePar: { id: number; nom: string; prenom: string } | null
  saisiesMensuelles: { mois: number; annee: number; valeur_realisee: number | null; statut: string }[]
  valeurAgregee: number
  tauxAtteinte: number
}

function typeBadgeClass(type: string): string {
  if (type === 'QUANTITATIF') return 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
  if (type === 'QUALITATIF') return 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
  return 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
}

function TypeIcon({ type }: { type: string }) {
  if (type === 'QUANTITATIF') return <BarChart3 className="h-3.5 w-4" />
  if (type === 'QUALITATIF') return <Star className="h-3.5 w-4" />
  return <TrendingUp className="h-3.5 w-4" />
}

const STATUT_SAISIE_LABEL: Record<string, string> = {
  OUVERTE: 'Non saisie',
  SOUMISE: 'Soumise',
  VALIDEE: 'Validée',
  AJUSTEE: 'Ajustée',
  REJETEE: 'Rejetée',
  EN_RETARD: 'En retard',
  VERROUILLEE: 'Verrouillée',
  MANQUANTE: 'Manquante',
}

interface MesKpiPersoSectionProps {
  /** Ex. "le DG" ou "votre Chef de service". Utilisé si aucun KPI n'a d'assigneur. */
  assigneParLabel?: string
  lienSaisie?: string
}

export function MesKpiPersoSection({ assigneParLabel = 'votre N+1', lienSaisie = '/saisie' }: MesKpiPersoSectionProps) {
  const [list, setList] = useState<KpiPersoItem[]>([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const moisCourant = now.getMonth() + 1
  const anneeCourant = now.getFullYear()

  const fetchPerso = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/kpi/employe/mes-kpi-perso')
      if (!res.ok) {
        setList([])
        return
      }
      const data = await res.json()
      setList(data.list ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPerso()
  }, [fetchPerso])

  const periodeActive = list.find((k) => k.periode?.statut === 'EN_COURS')?.periode
  const kpisPeriodeActive = list.filter((k) => k.periode?.statut === 'EN_COURS')
  const kpisValides = kpisPeriodeActive.filter((k) => k.statut === 'VALIDE')
  const dateLimite = periodeActive?.date_limite_saisie
    ? new Date(periodeActive.date_limite_saisie)
    : null
  const saisieOuverte = dateLimite ? now < dateLimite : false
  const kpisASaisir = kpisValides.filter((k) => {
    const saisieMois = k.saisiesMensuelles.find((s) => s.mois === moisCourant && s.annee === anneeCourant)
    return !saisieMois || !['SOUMISE', 'VALIDEE', 'AJUSTEE'].includes(saisieMois.statut)
  })
  const showBandeau = saisieOuverte && kpisASaisir.length > 0
  const tauxGlobal =
    kpisPeriodeActive.length > 0
      ? kpisPeriodeActive.reduce((s, k) => s + k.tauxAtteinte * (k.poids / 100), 0)
      : 0
  const radialData = [{ name: 'Perso', value: Math.min(100, Math.round(tauxGlobal)), fill: '#3b82f6' }]

  if (loading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Chargement de vos KPI personnels…</p>
        </CardContent>
      </Card>
    )
  }

  if (list.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Bandeau alerte saisie */}
      {showBandeau && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Vous avez {kpisASaisir.length} KPI personnels à saisir
              {dateLimite ? ` avant le ${dateLimite.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.
            </span>
            <Link href={lienSaisie}>
              <Button size="sm">Saisir maintenant</Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Section A — Score personnel */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Mes objectifs personnels — {periodeActive?.code ?? 'Période'}
          </CardTitle>
          <CardDescription>
            Assignés par : {kpisPeriodeActive[0]?.assignePar
              ? `${kpisPeriodeActive[0].assignePar.prenom} ${kpisPeriodeActive[0].assignePar.nom}`
              : assigneParLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-36 h-36 shrink-0">
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
              <div className="text-center -mt-14 text-lg font-bold">
                {tauxGlobal.toFixed(0)} %
              </div>
            </div>
            <div className="flex-1 w-full space-y-3">
              {kpisPeriodeActive.map((kpi) => {
                const saisieMois = kpi.saisiesMensuelles.find((s) => s.mois === moisCourant && s.annee === anneeCourant)
                const statutSaisie = saisieMois?.statut ?? 'OUVERTE'
                const peutSaisir = kpi.statut === 'VALIDE' && saisieOuverte && !['SOUMISE', 'VALIDEE', 'AJUSTEE'].includes(statutSaisie)
                return (
                  <div
                    key={kpi.id}
                    className="rounded-lg border bg-card p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{kpi.nom}</span>
                        <Badge variant="secondary" className={typeBadgeClass(kpi.type)}>
                          <TypeIcon type={kpi.type} />
                          <span className="ml-1">{kpi.type}</span>
                        </Badge>
                        {saisieMois && (
                          <Badge variant="outline" className="text-xs">
                            {STATUT_SAISIE_LABEL[statutSaisie] ?? statutSaisie}
                          </Badge>
                        )}
                      </div>
                      {peutSaisir && (
                        <Link href={lienSaisie}>
                          <Button size="sm" variant="outline">
                            <ClipboardList className="h-4 w-4 mr-1" />
                            Saisir
                          </Button>
                        </Link>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span>Cible : {kpi.cible}{kpi.unite ? ` ${kpi.unite}` : ''}</span>
                      <span>Réalisé : {kpi.valeurAgregee}{kpi.unite ? ` ${kpi.unite}` : ''}</span>
                      <span className="font-medium text-foreground">{kpi.tauxAtteinte.toFixed(0)} %</span>
                    </div>
                    <Progress
                      value={Math.min(100, kpi.tauxAtteinte)}
                      className="h-2"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
