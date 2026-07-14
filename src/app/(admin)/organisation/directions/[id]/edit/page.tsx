'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DirectionForm } from '@/components/forms/DirectionForm'
import type { DirectionUpdateInput } from '@/lib/validations/organisation'
import {
  formaterNomKpiAffichage,
  kpiCorrespondRecherche,
  libellerFrequenceKpi,
} from '@/lib/kpi-cible-utils'
import { libellerPorteeKpi } from '@/lib/portee-kpi-labels'
import {
  ArrowLeft,
  Building2,
  Loader2,
  Plus,
  Search,
  Target,
  Trash2,
} from 'lucide-react'

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
    portee?: string
  }
  canRemove: boolean
  removeBlockedReason: string | null
}

type CatalogueItem = {
  id: number
  code: string | null
  nom: string
  description: string | null
  type: string
  frequence: string | null
  unite: string | null
  actif: boolean
  portee?: string
}

const TYPE_LABEL: Record<string, string> = {
  QUANTITATIF: 'Quantitatif',
  QUALITATIF: 'Qualitatif',
  COMPORTEMENTAL: 'Comportemental',
}

export default function DirectionEditPage() {
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

  const [pickerOpen, setPickerOpen] = useState(false)
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([])
  const [pickerSearch, setPickerSearch] = useState('')
  const [assigningId, setAssigningId] = useState<number | null>(null)
  const [removeTarget, setRemoveTarget] = useState<DirectionKpiRow | null>(null)
  const [removing, setRemoving] = useState(false)

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

  const fetchCatalogue = useCallback(async () => {
    const res = await fetch('/api/kpi/catalogue?actif=true')
    if (!res.ok) return
    setCatalogue(await res.json())
  }, [])

  useEffect(() => {
    if (Number.isNaN(directionId)) {
      router.push('/organisation?tab=directions')
      return
    }
    setLoading(true)
    Promise.all([fetchDirection(), fetchKpiList()]).finally(() => setLoading(false))
  }, [directionId, fetchDirection, fetchKpiList, router])

  const assignedIds = useMemo(() => {
    const ids = new Set<number>()
    for (const k of kpiList) {
      const id = Number(k.catalogueKpiId ?? k.catalogueKpi?.id)
      if (!Number.isNaN(id) && id > 0) ids.add(id)
    }
    return ids
  }, [kpiList])

  const pickerItems = useMemo(() => {
    return catalogue.filter((c) => {
      const catalogueId = Number(c.id)
      if (Number.isNaN(catalogueId) || assignedIds.has(catalogueId)) return false
      if (!pickerSearch.trim()) return true
      return kpiCorrespondRecherche(
        { nom: c.nom, code: c.code, description: c.description, objectif_qualite: null },
        pickerSearch
      )
    })
  }, [catalogue, assignedIds, pickerSearch])

  const handleDirectionSubmit = async (values: DirectionUpdateInput) => {
    const res = await fetch(`/api/organisation/directions/${directionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Mise à jour', variant: 'destructive' })
      return
    }
    setDirection(data)
    toast({ title: 'Direction mise à jour' })
  }

  const openPicker = async () => {
    setPickerSearch('')
    await fetchCatalogue()
    setPickerOpen(true)
  }

  const handleAssign = async (catalogueKpiId: number) => {
    if (assigningId != null) return
    const id = Number(catalogueKpiId)
    if (Number.isNaN(id) || id <= 0) {
      toast({ title: 'Erreur', description: 'Identifiant KPI invalide', variant: 'destructive' })
      return
    }
    if (assignedIds.has(id)) {
      toast({ title: 'Ce KPI est déjà dans la liste' })
      return
    }
    setAssigningId(id)
    try {
      const res = await fetch(`/api/organisation/directions/${directionId}/kpi-catalogue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogueKpiId: id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail =
          typeof data?.details === 'string' && data.details.trim()
            ? ` — ${data.details}`
            : ''
        toast({
          title: 'Erreur',
          description: `${data?.error ?? 'Affectation impossible'}${detail}`,
          variant: 'destructive',
        })
        return
      }
      await fetchKpiList()
      await fetchDirection()
      toast({ title: 'KPI affecté à la direction' })
    } finally {
      setAssigningId(null)
    }
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoving(true)
    try {
      const res = await fetch(
        `/api/organisation/directions/${directionId}/kpi-catalogue/${removeTarget.catalogueKpiId}`,
        { method: 'DELETE' }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Retrait impossible', variant: 'destructive' })
        return
      }
      setKpiList((prev) => prev.filter((k) => k.id !== removeTarget.id))
      setDirection((d) =>
        d
          ? { ...d, _count: { ...d._count, catalogueKpis: Math.max(0, d._count.catalogueKpis - 1) } }
          : d
      )
      toast({ title: 'KPI retiré de la direction' })
      setRemoveTarget(null)
    } finally {
      setRemoving(false)
    }
  }

  if (loading || !direction) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Chargement...
      </div>
    )
  }

  return (
    <TooltipProvider>
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
              <Link href={`/organisation/directions/${directionId}`} className="hover:text-foreground">
                {direction.nom}
              </Link>
              <span>/</span>
              <span className="text-foreground">Modifier</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Modifier — {direction.nom}
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
            <Button variant="outline" asChild className="gap-2">
              <Link href={`/organisation/directions/${directionId}`}>
                <ArrowLeft className="h-4 w-4" />
                Fiche
              </Link>
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link href="/organisation?tab=directions">
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
                <CardDescription>
                  Nom, code et description de la direction.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DirectionForm
                  defaultValues={{
                    nom: direction.nom,
                    code: direction.code,
                    description: direction.description ?? '',
                  }}
                  directeurTitulaire={direction.directeurTitulaire}
                  onSubmit={handleDirectionSubmit}
                  isEdit
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kpi" className="mt-4 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              <Button onClick={openPicker} className="gap-2 shrink-0">
                <Plus className="h-4 w-4" />
                Ajouter un KPI
              </Button>
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
                  <Button variant="outline" className="mt-4 gap-2" onClick={openPicker}>
                    <Plus className="h-4 w-4" />
                    Ajouter un KPI du catalogue
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {kpiList.map((row) => (
                  <Card key={row.id} className="border-border/60">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {row.catalogueKpi.code && (
                            <Badge variant="outline" className="font-mono text-xs mb-2">
                              {row.catalogueKpi.code}
                            </Badge>
                          )}
                          {row.catalogueKpi.portee && (
                            <Badge variant="secondary" className="text-xs mb-2">
                              {libellerPorteeKpi(row.catalogueKpi.portee)}
                            </Badge>
                          )}
                          <CardTitle className="text-sm font-semibold leading-snug line-clamp-2">
                            {formaterNomKpiAffichage(row.catalogueKpi.nom)}
                          </CardTitle>
                        </div>
                        {row.canRemove ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                            onClick={() => setRemoveTarget(row)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  disabled
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              {row.removeBlockedReason}
                            </TooltipContent>
                          </Tooltip>
                        )}
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

        <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Ajouter un KPI du catalogue</DialogTitle>
              <DialogDescription>
                Sélectionnez un KPI actif (portée direction) à affecter à {direction.nom}.
              </DialogDescription>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou code..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1 space-y-2 max-h-[50vh]">
              {pickerItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {catalogue.length === 0
                    ? 'Chargement du catalogue...'
                    : 'Aucun KPI disponible (déjà affectés ou aucun résultat).'}
                </p>
              ) : (
                pickerItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={assigningId != null}
                    onClick={() => handleAssign(item.id)}
                    className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {item.code && (
                          <span className="text-xs font-mono text-muted-foreground">{item.code}</span>
                        )}
                        <p className="text-sm font-medium line-clamp-2">
                          {formaterNomKpiAffichage(item.nom)}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.frequence && (
                            <Badge variant="outline" className="text-[10px] h-5">
                              {libellerFrequenceKpi(item.frequence)}
                            </Badge>
                          )}
                          {item.unite && (
                            <Badge variant="outline" className="text-[10px] h-5">
                              {item.unite}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {assigningId === item.id && (
                        <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Retirer ce KPI ?</AlertDialogTitle>
              <AlertDialogDescription>
                {removeTarget && (
                  <>
                    Retirer « {formaterNomKpiAffichage(removeTarget.catalogueKpi.nom)} » du référentiel
                    permanent de {direction.nom} ?
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removing}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleRemove()
                }}
                disabled={removing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {removing ? 'Retrait...' : 'Retirer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}
