'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { toast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  formaterNomKpiAffichage,
  libellerFrequenceKpi,
} from '@/lib/kpi-cible-utils'
import { ArrowLeft, Building2, Loader2, Pencil, Target } from 'lucide-react'

type DirectionDetail = {
  id: number
  nom: string
  code: string
  description: string | null
  actif: boolean
  directeurTitulaire: { id: number; nom: string; prenom: string; email: string } | null
  _count: { services: number; catalogueKpis: number }
}

type DirectionKpiRow = {
  id: number
  catalogueKpiId: number
  catalogueKpi: {
    id: number
    code: string | null
    nom: string
    description: string | null
    type: string
    frequence: string | null
    unite: string | null
    categorie: string | null
    actif: boolean
  }
}

const TYPE_LABEL: Record<string, string> = {
  QUANTITATIF: 'Quantitatif',
  QUALITATIF: 'Qualitatif',
  COMPORTEMENTAL: 'Comportemental',
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4 py-2 border-b border-border/40 last:border-0">
      <dt className="text-sm font-medium text-muted-foreground sm:w-40 shrink-0">{label}</dt>
      <dd className="text-sm">{value ?? '—'}</dd>
    </div>
  )
}

export default function DirectionFichePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const directionId = parseInt(String(params.id), 10)

  const initialTab = searchParams.get('tab') === 'kpi' ? 'kpi' : 'info'
  const [tab, setTab] = useState(initialTab)
  const [loading, setLoading] = useState(true)
  const [direction, setDirection] = useState<DirectionDetail | null>(null)
  const [kpiList, setKpiList] = useState<DirectionKpiRow[]>([])
  const [loadingKpi, setLoadingKpi] = useState(false)

  const fetchDirection = useCallback(async () => {
    if (Number.isNaN(directionId)) return
    const res = await fetch(`/api/organisation/directions/${directionId}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? 'Direction introuvable', variant: 'destructive' })
      router.push('/organisation?tab=directions')
      return
    }
    setDirection(await res.json())
  }, [directionId, router])

  const fetchKpiList = useCallback(async () => {
    if (Number.isNaN(directionId)) return
    setLoadingKpi(true)
    const res = await fetch(`/api/organisation/directions/${directionId}/kpi-catalogue`)
    setLoadingKpi(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? 'Chargement KPI', variant: 'destructive' })
      return
    }
    setKpiList(await res.json())
  }, [directionId])

  useEffect(() => {
    if (Number.isNaN(directionId)) {
      router.push('/organisation?tab=directions')
      return
    }
    setLoading(true)
    Promise.all([fetchDirection(), fetchKpiList()]).finally(() => setLoading(false))
  }, [directionId, fetchDirection, fetchKpiList, router])

  if (loading || !direction) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Chargement...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/organisation?tab=directions" className="hover:text-foreground">
              Organisation
            </Link>
            <span>/</span>
            <Link href="/organisation?tab=directions" className="hover:text-foreground">
              Directions
            </Link>
            <span>/</span>
            <span className="text-foreground">{direction.nom}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            {direction.nom}
          </h1>
          <p className="text-sm text-muted-foreground">
            Code {direction.code}
            {!direction.actif && (
              <Badge variant="outline" className="ml-2 text-muted-foreground">
                Inactive
              </Badge>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button asChild className="gap-2">
            <Link href={`/organisation/directions/${directionId}/edit`}>
              <Pencil className="h-4 w-4" />
              Modifier
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/organisation?tab=directions">
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="kpi">
            KPI de la direction
            {direction._count.catalogueKpis > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {direction._count.catalogueKpis}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
              <CardDescription>Fiche de la direction.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl>
                <DetailRow label="Nom" value={direction.nom} />
                <DetailRow label="Code" value={direction.code} />
                <DetailRow label="Description" value={direction.description?.trim() || '—'} />
                <DetailRow
                  label="Directeur titulaire"
                  value={
                    direction.directeurTitulaire
                      ? `${direction.directeurTitulaire.prenom} ${direction.directeurTitulaire.nom} (${direction.directeurTitulaire.email})`
                      : '—'
                  }
                />
                <DetailRow
                  label="Départements / Agences"
                  value={`${direction._count.services} département${direction._count.services !== 1 ? 's' : ''} / agence${direction._count.services !== 1 ? 's' : ''}`}
                />
                <DetailRow
                  label="Statut"
                  value={
                    <span
                      className={`inline-flex text-xs px-2 py-0.5 rounded-full ${direction.actif ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}
                    >
                      {direction.actif ? 'Actif' : 'Inactif'}
                    </span>
                  }
                />
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpi" className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-medium">
              {direction._count.catalogueKpis} KPI affecté
              {direction._count.catalogueKpis !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Référentiel permanent — le paramétrage cible/poids par période se fait dans{' '}
              <Link href="/directeur/kpi-direction" className="text-primary underline-offset-4 hover:underline">
                KPI des directions
              </Link>
              .
            </p>
          </div>

          {loadingKpi ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des KPI...
            </div>
          ) : kpiList.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Aucun KPI affecté à cette direction.</p>
                <Button variant="outline" className="mt-4 gap-2" asChild>
                  <Link href={`/organisation/directions/${directionId}/edit?tab=kpi`}>
                    <Pencil className="h-4 w-4" />
                    Gérer les KPI
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {kpiList.map((row) => (
                <Card key={row.id} className="border-border/60">
                  <CardHeader className="pb-2">
                    <div className="min-w-0">
                      {row.catalogueKpi.code && (
                        <Badge variant="outline" className="font-mono text-xs mb-2">
                          {row.catalogueKpi.code}
                        </Badge>
                      )}
                      <CardTitle className="text-sm font-semibold leading-snug line-clamp-2">
                        {formaterNomKpiAffichage(row.catalogueKpi.nom)}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs font-normal">
                        {TYPE_LABEL[row.catalogueKpi.type] ?? row.catalogueKpi.type}
                      </Badge>
                      {row.catalogueKpi.frequence && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {libellerFrequenceKpi(row.catalogueKpi.frequence)}
                        </Badge>
                      )}
                      {row.catalogueKpi.unite && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {row.catalogueKpi.unite}
                        </Badge>
                      )}
                    </div>
                    {row.catalogueKpi.description?.trim() && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {row.catalogueKpi.description.trim()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
