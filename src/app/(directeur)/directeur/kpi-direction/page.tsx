'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { TOAST } from '@/lib/toast-messages'
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
import { Calendar, Target, PieChart, Edit, Plus, CheckCircle, Trash2 } from 'lucide-react'

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

type KpiServiceRow = {
  id: number
  poids_dans_direction: number | null
  service: { id: number; nom: string; code: string }
}

type KpiDirectionRow = {
  id: number
  cible: number
  poids: number
  description_complementaire: string | null
  statut: string
  catalogueKpi: CatalogueItem
  periode: { id: number; code: string; statut: string }
  direction?: { id: number; nom: string; code: string }
  kpiServices: KpiServiceRow[]
}

type DirectionResponse = {
  list: KpiDirectionRow[]
  poidsUtilise: number
  poidsRestant: number
}

type DirectionOption = { id: number; nom: string; code?: string }

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

export default function KpiDirectionPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role ?? ''
  const isDG = role === 'DG'
  const [periodes, setPeriodes] = useState<Periode[]>([])
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [directions, setDirections] = useState<DirectionOption[]>([])
  const [selectedDirectionId, setSelectedDirectionId] = useState<string>('')
  const [directionData, setDirectionData] = useState<DirectionResponse | null>(null)
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingKpi, setLoadingKpi] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editKpi, setEditKpi] = useState<KpiDirectionRow | null>(null)
  const [formCatalogueId, setFormCatalogueId] = useState<string>('')
  const [formCible, setFormCible] = useState('')
  const [formPoids, setFormPoids] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [catalogueFilter, setCatalogueFilter] = useState('')

  const [confirmAction, setConfirmAction] = useState<'delete' | 'activer' | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<KpiDirectionRow | null>(null)

  const fetchPeriodes = useCallback(async () => {
    const res = await fetch('/api/periodes')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data?.error ?? 'Chargement périodes')
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
      toast.error(data?.error ?? 'Chargement catalogue')
      return
    }
    const data = await res.json()
    setCatalogue(data.filter((c: CatalogueItem) => c.actif))
  }, [])

  const fetchDirections = useCallback(async () => {
    const res = await fetch('/api/organisation/directions?actif=true')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data?.error ?? 'Chargement directions')
      return
    }
    const data = await res.json()
    const list = (data ?? []).map((d: { id: number; nom: string; code?: string }) => ({ id: d.id, nom: d.nom, code: d.code }))
    setDirections(list)
    if (list.length > 0) setSelectedDirectionId((prev) => prev || String(list[0].id))
  }, [])

  const fetchDirectionKpi = useCallback(async () => {
    if (periodeId == null) return
    if (isDG && !selectedDirectionId) return
    setLoadingKpi(true)
    const url = isDG
      ? `/api/kpi/direction?periodeId=${periodeId}&directionId=${selectedDirectionId}`
      : `/api/kpi/direction?periodeId=${periodeId}`
    const res = await fetch(url)
    setLoadingKpi(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data?.error ?? 'Chargement KPI')
      return
    }
    const data = await res.json()
    if (data.allDirections && data.directions) {
      setDirectionData(null)
      return
    }
    setDirectionData(data)
  }, [periodeId, isDG, selectedDirectionId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const promises: Promise<void>[] = [fetchPeriodes(), fetchCatalogue()]
    if (isDG) promises.push(fetchDirections())
    Promise.all(promises).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [fetchPeriodes, fetchCatalogue, isDG, fetchDirections])

  useEffect(() => {
    if (periodeId != null && (!isDG || selectedDirectionId)) fetchDirectionKpi()
  }, [periodeId, fetchDirectionKpi, isDG, selectedDirectionId])

  const selectedPeriode = periodes.find((p) => p.id === periodeId)
  const directionNom =
    directionData?.list?.[0]?.direction?.nom ??
    (isDG && selectedDirectionId ? directions.find((d) => String(d.id) === selectedDirectionId)?.nom : null) ??
    null
  const poidsUtilise = directionData?.poidsUtilise ?? 0
  const poidsRestant = directionData?.poidsRestant ?? 100
  const poidsOk = Math.abs(poidsUtilise - 100) < 0.01

  const filteredCatalogue = catalogueFilter
    ? catalogue.filter((c) => c.nom.toLowerCase().includes(catalogueFilter.toLowerCase()))
    : catalogue

  const selectedCatalogueItem = catalogue.find((c) => String(c.id) === formCatalogueId)

  const openAdd = () => {
    setEditKpi(null)
    setFormCatalogueId('')
    setFormCible('')
    setFormPoids('')
    setFormDescription('')
    setCatalogueFilter('')
    setModalOpen(true)
  }

  const openEdit = (row: KpiDirectionRow) => {
    setEditKpi(row)
    setFormCatalogueId(String(row.catalogueKpi.id))
    setFormCible(String(row.cible))
    setFormPoids(String(row.poids))
    setFormDescription(row.description_complementaire ?? '')
    setCatalogueFilter('')
    setModalOpen(true)
  }

  const handleSubmitKpi = async () => {
    if (periodeId == null) return
    const cibleNum = parseFloat(formCible)
    const poidsNum = parseFloat(formPoids)
    if (Number.isNaN(cibleNum) || Number.isNaN(poidsNum)) {
      toast.error(TOAST.ERROR_VALIDATION)
      return
    }
    setSubmitting(true)
    try {
      if (editKpi) {
        const res = await fetch(`/api/kpi/direction/${editKpi.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cible: cibleNum,
            poids: poidsNum,
            description_complementaire: formDescription || null,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast.error(data?.error ?? TOAST.ERROR_SERVER)
          return
        }
        toast.success(TOAST.KPI_DIR_UPDATED)
        setModalOpen(false)
        await fetchDirectionKpi()
        router.refresh()
      } else {
        if (!formCatalogueId) {
          toast.error('Sélectionnez un KPI du catalogue')
          return
        }
        const body = {
          catalogueKpiId: parseInt(formCatalogueId, 10),
          periodeId,
          ...(isDG && selectedDirectionId ? { directionId: parseInt(selectedDirectionId, 10) } : {}),
          cible: cibleNum,
          poids: poidsNum,
          description_complementaire: formDescription || null,
        }
        const res = await fetch('/api/kpi/direction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const msg = data?.error ?? TOAST.ERROR_SERVER
          toast.error(msg)
          return
        }
        toast.success(TOAST.KPI_DIR_CREATED)
        setModalOpen(false)
        await fetchDirectionKpi()
        router.refresh()
      }
    } catch {
      toast.error(TOAST.ERROR_NETWORK)
    } finally {
      setSubmitting(false)
    }
  }

  const handleActiver = async (row: KpiDirectionRow) => {
    const res = await fetch(`/api/kpi/direction/${row.id}/activer`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data?.error ?? 'Activation')
      return
    }
    toast.success(TOAST.KPI_DIR_ACTIVATED)
    setConfirmAction(null)
    setConfirmTarget(null)
    fetchDirectionKpi()
    router.refresh()
  }

  const handleDelete = async (row: KpiDirectionRow) => {
    const res = await fetch(`/api/kpi/direction/${row.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data?.error ?? 'Suppression')
      return
    }
    toast.success(TOAST.KPI_DIR_DELETED)
    setConfirmAction(null)
    setConfirmTarget(null)
    fetchDirectionKpi()
    router.refresh()
  }

  const dynamicPoidsRestant = (() => {
    if (editKpi) {
      const current = directionData?.list?.filter((k) => k.statut === 'ACTIF' && k.id !== editKpi.id) ?? []
      const sum = current.reduce((s, k) => s + k.poids, 0)
      const adding = parseFloat(formPoids) || 0
      return Math.max(0, 100 - sum - adding)
    }
    const current = directionData?.list?.filter((k) => k.statut === 'ACTIF') ?? []
    const sum = current.reduce((s, k) => s + k.poids, 0)
    const adding = parseFloat(formPoids) || 0
    return Math.max(0, 100 - sum - adding)
  })()

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">KPI de la direction</h1>
        <p className="text-muted-foreground mt-1">
          Gérer les KPI de ma direction{directionNom ? ` (${directionNom})` : ''} pour la période sélectionnée
        </p>
      </div>

      {/* Sélecteur direction (DG uniquement) */}
      {isDG && (
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <label className="font-medium text-sm">Direction consultée :</label>
              <Select
                value={selectedDirectionId}
                onValueChange={setSelectedDirectionId}
                disabled={loading || directions.length === 0}
              >
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Choisir une direction" />
                </SelectTrigger>
                <SelectContent>
                  {directions.map((dir) => (
                    <SelectItem key={dir.id} value={String(dir.id)}>
                      {dir.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline">Vue DG — accès toutes directions</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 1 — Période */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Période active</CardTitle>
              <CardDescription>Choisir la période pour les KPI direction</CardDescription>
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

      {/* Section 2 — Liste KPI */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">KPI de la direction</CardTitle>
                <CardDescription>Liste des KPI et répartition des poids</CardDescription>
              </div>
            </div>
            <Button onClick={openAdd} disabled={periodeId == null || (isDG && !selectedDirectionId)} className="gap-2">
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
                    <TableHead>Poids</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(directionData?.list ?? []).map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.catalogueKpi.nom}</TableCell>
                      <TableCell>{k.catalogueKpi.type}</TableCell>
                      <TableCell>{k.cible}</TableCell>
                      <TableCell>{k.catalogueKpi.unite ?? '—'}</TableCell>
                      <TableCell>{k.poids}%</TableCell>
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

      {/* Section 3 — Modal formulaire */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editKpi ? 'Modifier le KPI direction' : 'Ajouter un KPI direction'}</DialogTitle>
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
                  <Select value={formCatalogueId} onValueChange={(v) => setFormCatalogueId(v)}>
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
            <div>
              <label className="text-sm font-medium mb-2 block">Description complémentaire (optionnel)</label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optionnel"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
                Annuler
              </Button>
              <Button onClick={handleSubmitKpi} disabled={submitting}>
                {submitting ? 'Envoi…' : editKpi ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Section 4 — Vue consolidation */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <PieChart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Vue consolidation</CardTitle>
              <CardDescription>
                Contribution des KPI Service par KPI direction (lecture seule)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {periodeId == null || loadingKpi ? (
            <p className="text-muted-foreground">
              {periodeId == null ? 'Sélectionnez une période.' : 'Chargement...'}
            </p>
          ) : (
            <div className="space-y-6">
              {(directionData?.list ?? []).map((kpiDir) => {
                const total = (kpiDir.kpiServices ?? []).reduce((s, ks) => s + (ks.poids_dans_direction ?? 0), 0)
                const totalOk = Math.abs(total - 100) < 0.01
                return (
                  <div key={kpiDir.id} className="rounded-lg border p-4 space-y-2">
                    <p className="font-medium">{kpiDir.catalogueKpi.nom}</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Service</TableHead>
                          <TableHead>Poids contribution (%)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(kpiDir.kpiServices ?? []).map((ks) => (
                          <TableRow key={ks.id}>
                            <TableCell>{ks.service.nom} ({ks.service.code})</TableCell>
                            <TableCell>{ks.poids_dans_direction != null ? `${ks.poids_dans_direction}%` : '—'}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell className="font-medium">Total</TableCell>
                          <TableCell className={totalOk ? 'text-green-600' : 'text-red-600'}>
                            {total.toFixed(1)}% {totalOk ? '(100%)' : ''}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )
              })}
              {(directionData?.list ?? []).length === 0 && (
                <p className="text-muted-foreground">Aucun KPI direction pour cette période.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmations */}
      <AlertDialog open={confirmAction === 'delete'} onOpenChange={(o) => !o && (setConfirmAction(null), setConfirmTarget(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce KPI direction ?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget && `KPI « ${confirmTarget.catalogueKpi.nom } » sera supprimé.`}
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
              {confirmTarget && `Le KPI « ${confirmTarget.catalogueKpi.nom } » passera en statut Actif. La somme des poids des KPI actifs doit rester à 100%.`}
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
