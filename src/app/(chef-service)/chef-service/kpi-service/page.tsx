'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Calendar, Target, Edit, Plus, CheckCircle, Trash2, AlertTriangle } from 'lucide-react'

type Periode = {
  id: number
  code: string
  type: string
  statut: string
  date_debut: string
  date_fin: string
  actif: boolean
}

type CatalogueItem = {
  id: number
  nom: string
  description: string | null
  type: string
  unite: string | null
  mode_agregation: string
  actif: boolean
}

type KpiDirectionOption = {
  id: number
  cible: number
  poids: number
  catalogueKpi: { id: number; nom: string }
  direction: { nom: string }
}

type KpiServiceRow = {
  id: number
  cible: number
  poids: number
  poids_dans_direction: number | null
  kpiDirectionId: number | null
  statut: string
  catalogueKpi: CatalogueItem
  kpiDirection: { id: number; cible: number; poids: number; catalogueKpi: { nom: string }; direction?: { nom: string } } | null
  service: { id: number; nom: string; code: string }
}

type ServiceResponse = {
  serviceNom?: string | null
  serviceCode?: string | null
  list: KpiServiceRow[]
  poidsUtilise: number
  poidsRestant: number
  contributionParDirection: Record<string, number>
}

const STATUT_PERIODE_MAP: Record<string, { label: string; className: string }> = {
  A_VENIR: { label: 'À venir', className: 'bg-muted text-muted-foreground' },
  EN_COURS: { label: 'En cours', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  CLOTUREE: { label: 'Clôturée', className: 'bg-red-500/10 text-red-700 dark:text-red-400' },
}

const STATUT_KPI_MAP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Brouillon', className: 'bg-muted text-muted-foreground' },
  ACTIF: { label: 'Actif', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  CLOTURE: { label: 'Clôturé', className: 'bg-red-500/10 text-red-700 dark:text-red-400' },
}

export default function KpiServicePage() {
  const searchParams = useSearchParams()
  const serviceIdFromUrl = searchParams.get('serviceId')
  const [periodes, setPeriodes] = useState<Periode[]>([])
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([])
  const [kpiDirections, setKpiDirections] = useState<KpiDirectionOption[]>([])
  const [serviceData, setServiceData] = useState<ServiceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingKpi, setLoadingKpi] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editKpi, setEditKpi] = useState<KpiServiceRow | null>(null)
  const [formCatalogueId, setFormCatalogueId] = useState('')
  const [formKpiDirectionId, setFormKpiDirectionId] = useState<string>('none')
  const [formPoidsDansDirection, setFormPoidsDansDirection] = useState('')
  const [formCible, setFormCible] = useState('')
  const [formPoids, setFormPoids] = useState('')
  const [catalogueFilter, setCatalogueFilter] = useState('')

  const [confirmAction, setConfirmAction] = useState<'delete' | 'activer' | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<KpiServiceRow | null>(null)

  const fetchPeriodes = useCallback(async () => {
    const res = await fetch('/api/periodes')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? 'Chargement périodes', variant: 'destructive' })
      return
    }
    const data = await res.json()
    setPeriodes(data)
    if (data.length > 0 && !periodeId) setPeriodeId(data[0].id)
  }, [periodeId])

  const fetchCatalogue = useCallback(async () => {
    const res = await fetch('/api/kpi/catalogue')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? 'Chargement catalogue', variant: 'destructive' })
      return
    }
    const data = await res.json()
    setCatalogue(data.filter((c: CatalogueItem) => c.actif))
  }, [])

  const fetchKpiDirections = useCallback(async () => {
    if (periodeId == null) return
    const res = await fetch(`/api/kpi/direction-by-service?periodeId=${periodeId}`)
    if (!res.ok) return
    const data = await res.json()
    setKpiDirections(data)
  }, [periodeId])

  const fetchServiceKpi = useCallback(async () => {
    if (periodeId == null) return
    setLoadingKpi(true)
    const url = serviceIdFromUrl
      ? `/api/kpi/service?periodeId=${periodeId}&serviceId=${serviceIdFromUrl}`
      : `/api/kpi/service?periodeId=${periodeId}`
    const res = await fetch(url)
    setLoadingKpi(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? 'Chargement KPI', variant: 'destructive' })
      return
    }
    const data = await res.json()
    setServiceData(data)
  }, [periodeId, serviceIdFromUrl])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([fetchPeriodes(), fetchCatalogue()]).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [fetchPeriodes, fetchCatalogue])

  useEffect(() => {
    if (periodeId != null) {
      fetchKpiDirections()
      fetchServiceKpi()
    }
  }, [periodeId, fetchKpiDirections, fetchServiceKpi])

  const selectedPeriode = periodes.find((p) => p.id === periodeId)
  const serviceNom =
    serviceData?.serviceNom ??
    serviceData?.list?.[0]?.service?.nom ??
    null
  const poidsUtilise = serviceData?.poidsUtilise ?? 0
  const poidsRestant = serviceData?.poidsRestant ?? 100
  const poidsOk = Math.abs(poidsUtilise - 100) < 0.01
  const contributionParDirection = serviceData?.contributionParDirection ?? {}
  const alertesContribution = Object.entries(contributionParDirection).filter(
    ([_, sum]) => sum > 100.01
  )

  const filteredCatalogue = catalogueFilter
    ? catalogue.filter((c) => c.nom.toLowerCase().includes(catalogueFilter.toLowerCase()))
    : catalogue
  const selectedCatalogueItem = catalogue.find((c) => String(c.id) === formCatalogueId)

  const openAdd = () => {
    setEditKpi(null)
    setFormCatalogueId('')
    setFormKpiDirectionId('none')
    setFormPoidsDansDirection('')
    setFormCible('')
    setFormPoids('')
    setCatalogueFilter('')
    setModalOpen(true)
  }

  const openEdit = (row: KpiServiceRow) => {
    setEditKpi(row)
    setFormCatalogueId(String(row.catalogueKpi.id))
    setFormKpiDirectionId(row.kpiDirectionId != null ? String(row.kpiDirectionId) : 'none')
    setFormPoidsDansDirection(row.poids_dans_direction != null ? String(row.poids_dans_direction) : '')
    setFormCible(String(row.cible))
    setFormPoids(String(row.poids))
    setCatalogueFilter('')
    setModalOpen(true)
  }

  const handleSubmitKpi = async () => {
    if (periodeId == null) return
    const cibleNum = parseFloat(formCible)
    const poidsNum = parseFloat(formPoids)
    const poidsDansDirectionNum = formPoidsDansDirection ? parseFloat(formPoidsDansDirection) : null
    if (Number.isNaN(cibleNum) || Number.isNaN(poidsNum)) {
      toast({ title: 'Cible et poids doivent être des nombres', variant: 'destructive' })
      return
    }
    if (editKpi) {
      const res = await fetch(`/api/kpi/service/${editKpi.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpiDirectionId: formKpiDirectionId === 'none' ? null : parseInt(formKpiDirectionId, 10),
          poids_dans_direction: poidsDansDirectionNum,
          cible: cibleNum,
          poids: poidsNum,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Mise à jour', variant: 'destructive' })
        return
      }
      toast({ title: 'KPI mis à jour' })
    } else {
      if (!formCatalogueId) {
        toast({ title: 'Sélectionnez un KPI du catalogue', variant: 'destructive' })
        return
      }
      const res = await fetch('/api/kpi/service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogueKpiId: parseInt(formCatalogueId, 10),
          periodeId,
          kpiDirectionId: formKpiDirectionId === 'none' ? null : parseInt(formKpiDirectionId, 10),
          poids_dans_direction: poidsDansDirectionNum,
          cible: cibleNum,
          poids: poidsNum,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Création', variant: 'destructive' })
        return
      }
      toast({ title: 'KPI créé' })
    }
    setModalOpen(false)
    fetchServiceKpi()
  }

  const handleActiver = async (row: KpiServiceRow) => {
    const res = await fetch(`/api/kpi/service/${row.id}/activer`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Activation', variant: 'destructive' })
      return
    }
    toast({ title: 'KPI activé' })
    setConfirmAction(null)
    setConfirmTarget(null)
    fetchServiceKpi()
  }

  const handleDelete = async (row: KpiServiceRow) => {
    const res = await fetch(`/api/kpi/service/${row.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Suppression', variant: 'destructive' })
      return
    }
    toast({ title: 'KPI supprimé' })
    setConfirmAction(null)
    setConfirmTarget(null)
    fetchServiceKpi()
  }

  const dynamicPoidsRestant = (() => {
    if (editKpi) {
      const current = serviceData?.list?.filter((k) => k.statut === 'ACTIF' && k.id !== editKpi.id) ?? []
      const sum = current.reduce((s, k) => s + k.poids, 0)
      const adding = parseFloat(formPoids) || 0
      return Math.max(0, 100 - sum - adding)
    }
    const current = serviceData?.list?.filter((k) => k.statut === 'ACTIF') ?? []
    const sum = current.reduce((s, k) => s + k.poids, 0)
    const adding = parseFloat(formPoids) || 0
    return Math.max(0, 100 - sum - adding)
  })()

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          KPI du service{serviceNom ? ` — ${serviceNom}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">
          Gérer les KPI de mon service{serviceNom ? ` (${serviceNom})` : ''} pour la période sélectionnée
        </p>
      </div>

      {alertesContribution.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">
              Somme des contributions &gt; 100%
            </p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              Pour un ou plusieurs KPI direction, la somme des poids de contribution dépasse 100%. Ajustez les contributions.
            </p>
          </div>
        </div>
      )}

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Période active</CardTitle>
              <CardDescription>Choisir la période pour les KPI service</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <Select
                value={periodeId != null ? String(periodeId) : 'none'}
                onValueChange={(v) => (v !== 'none' ? setPeriodeId(parseInt(v, 10)) : setPeriodeId(null))}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sélectionner une période" />
                </SelectTrigger>
                <SelectContent>
                  {periodes.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPeriode && (
                <Badge className={STATUT_PERIODE_MAP[selectedPeriode.statut]?.className ?? 'bg-muted'}>
                  {STATUT_PERIODE_MAP[selectedPeriode.statut]?.label ?? selectedPeriode.statut}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">KPI du service</CardTitle>
                <CardDescription>Liste des KPI et répartition des poids</CardDescription>
              </div>
            </div>
            <Button onClick={openAdd} disabled={periodeId == null} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un KPI
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {periodeId == null ? (
            <p className="text-muted-foreground">Sélectionnez une période ci-dessus.</p>
          ) : loadingKpi ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Poids utilisé : {poidsUtilise.toFixed(1)}% / 100%</span>
                  <span className={poidsOk ? 'text-green-600' : 'text-red-600'}>
                    {poidsOk ? 'Répartition OK' : 'La somme doit faire 100%'}
                  </span>
                </div>
                <Progress value={Math.min(100, poidsUtilise)} className="h-2" />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>KPI</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Cible</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead>Poids %</TableHead>
                    <TableHead>KPI Direction parent</TableHead>
                    <TableHead>Contribution %</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(serviceData?.list ?? []).map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.catalogueKpi.nom}</TableCell>
                      <TableCell>{k.catalogueKpi.type}</TableCell>
                      <TableCell>{k.cible}</TableCell>
                      <TableCell>{k.catalogueKpi.unite ?? '—'}</TableCell>
                      <TableCell>{k.poids}%</TableCell>
                      <TableCell>
                        {k.kpiDirection
                          ? `${k.kpiDirection.catalogueKpi.nom} — ${k.kpiDirection.direction?.nom ?? ''}`
                          : '—'}
                      </TableCell>
                      <TableCell>{k.poids_dans_direction != null ? `${k.poids_dans_direction}%` : '—'}</TableCell>
                      <TableCell>
                        <Badge className={STATUT_KPI_MAP[k.statut]?.className ?? 'bg-muted'}>
                          {STATUT_KPI_MAP[k.statut]?.label ?? k.statut}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="mr-1" onClick={() => openEdit(k)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        {k.statut === 'DRAFT' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-1"
                            onClick={() => { setConfirmTarget(k); setConfirmAction('activer') }}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setConfirmTarget(k); setConfirmAction('delete') }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editKpi ? 'Modifier le KPI service' : 'Ajouter un KPI service'}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Poids restant disponible : <strong>{dynamicPoidsRestant.toFixed(1)}%</strong>
            </p>
          </DialogHeader>
          <div className="space-y-4">
            {!editKpi && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Rechercher dans le catalogue</label>
                  <Input
                    placeholder="Filtrer par nom..."
                    value={catalogueFilter}
                    onChange={(e) => setCatalogueFilter(e.target.value)}
                    className="mb-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">KPI (catalogue)</label>
                  <Select value={formCatalogueId} onValueChange={setFormCatalogueId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un KPI du catalogue" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCatalogue.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nom} ({c.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {editKpi && (
              <div>
                <label className="text-sm font-medium mb-2 block">KPI</label>
                <p className="text-sm text-muted-foreground">{editKpi.catalogueKpi.nom}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">KPI Direction parent (optionnel)</label>
              <Select value={formKpiDirectionId} onValueChange={setFormKpiDirectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {kpiDirections.map((kd) => (
                    <SelectItem key={kd.id} value={String(kd.id)}>
                      {kd.catalogueKpi.nom} — {kd.direction?.nom ?? ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formKpiDirectionId !== 'none' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Poids de contribution au KPI Direction (%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={formPoidsDansDirection}
                  onChange={(e) => setFormPoidsDansDirection(e.target.value)}
                  placeholder="0–100"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">Cible</label>
              <Input
                type="number"
                step="any"
                value={formCible}
                onChange={(e) => setFormCible(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Unité</label>
              <Input
                value={selectedCatalogueItem?.unite ?? editKpi?.catalogueKpi.unite ?? ''}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Poids (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={formPoids}
                onChange={(e) => setFormPoids(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button onClick={handleSubmitKpi}>{editKpi ? 'Enregistrer' : 'Créer'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmAction === 'delete'} onOpenChange={(o) => !o && (setConfirmAction(null), setConfirmTarget(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce KPI service ?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget && `Le KPI « ${confirmTarget.catalogueKpi.nom} » sera supprimé.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmTarget && handleDelete(confirmTarget)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmAction === 'activer'} onOpenChange={(o) => !o && (setConfirmAction(null), setConfirmTarget(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activer ce KPI ?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget && `Le KPI « ${confirmTarget.catalogueKpi.nom} » passera en statut Actif. La somme des poids des KPI actifs doit rester à 100%.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmTarget && handleActiver(confirmTarget)}>
              Activer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
