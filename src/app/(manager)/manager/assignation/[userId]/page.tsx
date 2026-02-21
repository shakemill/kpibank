'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Target, Plus, Edit, Trash2, Send } from 'lucide-react'

type Periode = { id: number; code: string; statut: string }
type KpiServiceOption = {
  id: number
  cible: number
  poids: number
  catalogueKpiId: number
  catalogueKpi: { id: number; nom: string; type: string; unite: string | null }
  service?: { id: number; nom: string; code: string }
}
type CatalogueOption = { id: number; nom: string; type: string; unite: string | null }
type KpiEmployeRow = {
  id: number
  cible: number
  poids: number
  statut: string
  catalogueKpi: { nom: string; unite: string | null }
  kpiService?: { id: number } | null
}

const STATUT_MAP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Brouillon', className: 'bg-muted text-muted-foreground' },
  NOTIFIE: { label: 'Notifié', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  ACCEPTE: { label: 'Accepté', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  CONTESTE: { label: 'Contesté', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  MAINTENU: { label: 'Maintenu', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  REVISE: { label: 'Révisé', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  VALIDE: { label: 'Validé', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  CLOTURE: { label: 'Clôturé', className: 'bg-muted text-muted-foreground' },
}

export default function AssignationEmployePage() {
  const params = useParams()
  const router = useRouter()
  const userId = typeof params.userId === 'string' ? parseInt(params.userId, 10) : NaN
  const [employe, setEmploye] = useState<{
    id: number
    nom: string
    prenom: string
    role: string
    serviceId: number | null
    directionId: number | null
    service: { id: number; nom: string; code: string } | null
    direction: { id: number; nom: string; code: string } | null
    manager: { id: number; nom: string; prenom: string } | null
  } | null>(null)
  const [periodes, setPeriodes] = useState<Periode[]>([])
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [kpiList, setKpiList] = useState<KpiEmployeRow[]>([])
  const [kpiServiceOptions, setKpiServiceOptions] = useState<KpiServiceOption[]>([])
  const [catalogueOptions, setCatalogueOptions] = useState<CatalogueOption[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingKpi, setLoadingKpi] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [formKpiServiceId, setFormKpiServiceId] = useState('')
  const [formCatalogueKpiId, setFormCatalogueKpiId] = useState('')
  const [formKpiRefId, setFormKpiRefId] = useState('')
  const [formCible, setFormCible] = useState('')
  const [formPoids, setFormPoids] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<KpiEmployeRow | null>(null)
  const [notifying, setNotifying] = useState(false)

  const fetchEmploye = useCallback(async () => {
    const res = await fetch('/api/users/equipe')
    if (!res.ok) return
    const data = await res.json()
    const found = data.find((u: { id: number }) => u.id === userId)
    if (!found) {
      toast({ title: 'Accès refusé', description: 'Cet employé n\'est pas dans votre équipe', variant: 'destructive' })
      router.replace('/manager/assignation')
      return
    }
    setEmploye(found)
  }, [userId, router])

  const fetchPeriodes = useCallback(async () => {
    const res = await fetch('/api/periodes')
    if (!res.ok) return
    const data = await res.json()
    setPeriodes(data)
    const enCours = data.find((p: Periode) => p.statut === 'EN_COURS')
    if (data.length > 0 && !periodeId) setPeriodeId(enCours ? enCours.id : data[0].id)
  }, [periodeId])

  const fetchKpiEmploye = useCallback(async () => {
    if (Number.isNaN(userId) || periodeId == null) return
    setLoadingKpi(true)
    const res = await fetch(`/api/kpi/employe?employeId=${userId}&periodeId=${periodeId}`)
    setLoadingKpi(false)
    if (!res.ok) return
    const data = await res.json()
    setKpiList(data.list ?? [])
  }, [userId, periodeId])

  const fetchKpiOptions = useCallback(async () => {
    if (!employe || periodeId == null) return
    const role = employe.role
    const rattacheDirect = employe.directionId != null && employe.serviceId == null
    if (rattacheDirect) {
      const resDir = await fetch(`/api/kpi/service/by-direction?directionId=${employe.directionId}&periodeId=${periodeId}`)
      if (resDir.ok) {
        const dirData = await resDir.json()
        setKpiServiceOptions(Array.isArray(dirData) ? dirData : [])
      } else setKpiServiceOptions([])
      const resCat = await fetch('/api/kpi/catalogue')
      if (resCat.ok) {
        const catData = await resCat.json()
        setCatalogueOptions(Array.isArray(catData) ? catData.filter((c: { actif: boolean }) => c.actif) : [])
      } else setCatalogueOptions([])
      return
    }
    if (role === 'EMPLOYE' || role === 'MANAGER') {
      if (!employe.serviceId) return
      const res = await fetch(`/api/kpi/service/by-service?serviceId=${employe.serviceId}&periodeId=${periodeId}`)
      if (!res.ok) return
      const data = await res.json()
      setKpiServiceOptions(data)
      setCatalogueOptions([])
    } else if (role === 'CHEF_SERVICE') {
      if (!employe.directionId) return
      const res = await fetch(`/api/kpi/service/by-direction?directionId=${employe.directionId}&periodeId=${periodeId}`)
      if (!res.ok) return
      const data = await res.json()
      setKpiServiceOptions(data)
      setCatalogueOptions([])
    } else if (role === 'DIRECTEUR') {
      const res = await fetch('/api/kpi/catalogue')
      if (!res.ok) return
      const data = await res.json()
      setCatalogueOptions(Array.isArray(data) ? data : [])
      setKpiServiceOptions([])
      const resDir = employe.directionId
        ? await fetch(`/api/kpi/service/by-direction?directionId=${employe.directionId}&periodeId=${periodeId}`)
        : null
      if (resDir?.ok) {
        const dirData = await resDir.json()
        setKpiServiceOptions(Array.isArray(dirData) ? dirData : [])
      }
    } else {
      setKpiServiceOptions([])
      setCatalogueOptions([])
    }
  }, [employe, periodeId])

  useEffect(() => {
    if (Number.isNaN(userId)) return
    let cancelled = false
    setLoading(true)
    fetchEmploye().then(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [userId, fetchEmploye])

  useEffect(() => {
    fetchPeriodes()
  }, [fetchPeriodes])

  useEffect(() => {
    if (periodeId != null) fetchKpiEmploye()
  }, [periodeId, fetchKpiEmploye])

  useEffect(() => {
    fetchKpiOptions()
  }, [fetchKpiOptions])

  const isDirecteur = employe?.role === 'DIRECTEUR'
  const drafts = kpiList.filter((k) => k.statut === 'DRAFT')
  const sumDraft = drafts.reduce((s, k) => s + k.poids, 0)
  const canNotify = drafts.length > 0 && Math.abs(sumDraft - 100) < 0.01
  const sumPoids = kpiList.reduce((s, k) => s + k.poids, 0)
  const poidsRestant = Math.max(0, 100 - sumPoids)
  const assignedKpiServiceIds = new Set(kpiList.map((k) => k.kpiService?.id).filter(Boolean) as number[])
  const assignedCatalogueIds = new Set(
    kpiList.map((k) => (k as { catalogueKpi?: { id?: number } }).catalogueKpi?.id).filter(Boolean) as number[]
  )
  const availableKpiServices = kpiServiceOptions.filter((s) => !assignedKpiServiceIds.has(s.id))
  const availableCatalogue = catalogueOptions.filter((c) => !assignedCatalogueIds.has(c.id))
  const selectedKpiService = kpiServiceOptions.find((s) => String(s.id) === formKpiServiceId)
  const selectedCatalogue = catalogueOptions.find((c) => String(c.id) === formCatalogueKpiId)
  const rattacheDirect = employe != null && employe.directionId != null && employe.serviceId == null
  const canAddKpi =
    periodeId != null &&
    (isDirecteur ||
      rattacheDirect ||
      (employe?.role === 'CHEF_SERVICE' && employe?.directionId != null) ||
      ((employe?.role === 'EMPLOYE' || employe?.role === 'MANAGER') && employe?.serviceId != null))

  const openAdd = () => {
    setFormKpiServiceId('')
    setFormCatalogueKpiId('')
    setFormKpiRefId('')
    setFormCible('')
    setFormPoids('')
    setModalOpen(true)
  }

  const handleAssign = async () => {
    if (Number.isNaN(userId) || periodeId == null) return
    const cibleNum = parseFloat(formCible)
    const poidsNum = parseFloat(formPoids)
    if (Number.isNaN(cibleNum) || Number.isNaN(poidsNum)) {
      toast({ title: 'Cible et poids requis', variant: 'destructive' })
      return
    }
    let body: { employeId: number; periodeId: number; cible: number; poids: number; kpiServiceId?: number; catalogueKpiId?: number }
    if (isDirecteur) {
      if (!formCatalogueKpiId) {
        toast({ title: 'Sélectionnez un KPI du catalogue', variant: 'destructive' })
        return
      }
      body = {
        employeId: userId,
        catalogueKpiId: parseInt(formCatalogueKpiId, 10),
        periodeId,
        cible: cibleNum,
        poids: poidsNum,
      }
      if (formKpiRefId) body.kpiServiceId = parseInt(formKpiRefId, 10)
    } else if (rattacheDirect) {
      body = { employeId: userId, periodeId, cible: cibleNum, poids: poidsNum }
      if (formKpiServiceId) {
        body.kpiServiceId = parseInt(formKpiServiceId, 10)
      } else if (formCatalogueKpiId) {
        body.catalogueKpiId = parseInt(formCatalogueKpiId, 10)
      } else {
        toast({ title: 'Sélectionnez un KPI du catalogue ou un KPI de référence', variant: 'destructive' })
        return
      }
    } else {
      if (!formKpiServiceId) {
        toast({ title: 'Sélectionnez un KPI', variant: 'destructive' })
        return
      }
      const kpiService = kpiServiceOptions.find((s) => String(s.id) === formKpiServiceId)
      if (!kpiService) return
      body = {
        employeId: userId,
        kpiServiceId: kpiService.id,
        periodeId,
        cible: cibleNum,
        poids: poidsNum,
      }
    }
    const res = await fetch('/api/kpi/employe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Assignation', variant: 'destructive' })
      return
    }
    toast({ title: 'KPI assigné' })
    setModalOpen(false)
    fetchKpiEmploye()
  }

  const handleDelete = async (row: KpiEmployeRow) => {
    const res = await fetch(`/api/kpi/employe/${row.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Suppression', variant: 'destructive' })
      return
    }
    toast({ title: 'KPI supprimé' })
    setConfirmDelete(null)
    fetchKpiEmploye()
  }

  const handleNotifier = async () => {
    if (!canNotify || periodeId == null) return
    setNotifying(true)
    const res = await fetch(`/api/kpi/employe/${userId}/notifier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodeId }),
    })
    const data = await res.json().catch(() => ({}))
    setNotifying(false)
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Notification', variant: 'destructive' })
      return
    }
    toast({ title: 'Employé notifié' })
    fetchKpiEmploye()
  }

  if (Number.isNaN(userId)) return null
  if (loading || !employe) {
    return <div className="p-6">Chargement...</div>
  }

  const isManagerOrDirecteur = employe.role === 'MANAGER' || employe.role === 'DIRECTEUR'

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/manager/assignation')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {employe.prenom} {employe.nom}
            {rattacheDirect && ' — Rattaché(e) à la direction'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Assigner et notifier les KPI pour la période sélectionnée
          </p>
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="pt-6">
          {rattacheDirect ? (
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Rattaché(e) directement à :</span>{' '}
                <strong>{employe.direction?.nom ?? 'Direction'}</strong>
              </p>
              {employe.manager && (
                <p>
                  <span className="text-muted-foreground">Manager direct :</span>{' '}
                  {employe.manager.prenom} {employe.manager.nom}
                </p>
              )}
              <p className="text-muted-foreground italic">
                Pas de service — KPI personnels (kpi_service_id optionnel)
              </p>
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              {employe.service && (
                <p>
                  <span className="text-muted-foreground">Service :</span>{' '}
                  <strong>{employe.service.nom}</strong> ({employe.service.code})
                </p>
              )}
              {employe.manager && (
                <p>
                  <span className="text-muted-foreground">Manager direct :</span>{' '}
                  {employe.manager.prenom} {employe.manager.nom}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {isManagerOrDirecteur && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
          Cet utilisateur est <strong>{employe.role === 'MANAGER' ? 'MANAGER' : 'DIRECTEUR'}</strong>.
          Les KPI que vous assignez ici sont ses objectifs personnels en tant que collaborateur, distincts de son rôle de gestionnaire.
        </div>
      )}

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Période</CardTitle>
              <CardDescription>Choisir la période</CardDescription>
            </div>
            <Select
              value={periodeId != null ? String(periodeId) : 'none'}
              onValueChange={(v) => (v !== 'none' ? setPeriodeId(parseInt(v, 10)) : setPeriodeId(null))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodes.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Button onClick={openAdd} disabled={!canAddKpi} className="gap-2">
              <Plus className="h-4 w-4" />
              Assigner un KPI
            </Button>
            <Button
              onClick={handleNotifier}
              disabled={!canNotify || notifying}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {notifying ? 'Envoi...' : 'Notifier l\'employé'}
            </Button>
            {drafts.length > 0 && !canNotify && (
              <span className="text-sm text-muted-foreground">
                (Somme des brouillons : {sumDraft.toFixed(1)}% — doit être 100% pour notifier)
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Poids restant : <strong>{poidsRestant.toFixed(1)}%</strong>
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KPI</TableHead>
                <TableHead>Cible</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead>Poids</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiList.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.catalogueKpi.nom}</TableCell>
                  <TableCell>{k.cible}</TableCell>
                  <TableCell>{k.catalogueKpi.unite ?? '—'}</TableCell>
                  <TableCell>{k.poids}%</TableCell>
                  <TableCell>
                    <Badge className={STATUT_MAP[k.statut]?.className ?? 'bg-muted'}>
                      {STATUT_MAP[k.statut]?.label ?? k.statut}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {k.statut === 'DRAFT' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDelete(k)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {kpiList.length === 0 && periodeId != null && (
            <p className="text-muted-foreground py-4">Aucun KPI assigné pour cette période.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assigner un KPI</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Poids restant : <strong>{poidsRestant.toFixed(1)}%</strong>
            </p>
          </DialogHeader>
          <div className="space-y-4">
            {rattacheDirect ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">KPI direction de référence (optionnel)</label>
                  <Select value={formKpiServiceId || '__none__'} onValueChange={(v) => setFormKpiServiceId(v === '__none__' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Aucun rattachement — KPI personnel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Aucun rattachement — KPI personnel</SelectItem>
                        {kpiServiceOptions.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {(s as { catalogueKpi?: { nom: string } }).catalogueKpi?.nom ?? 'KPI'} — {(s as { service?: { nom: string } }).service?.nom ?? ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {!formKpiServiceId && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">KPI (catalogue)</label>
                    <Select value={formCatalogueKpiId} onValueChange={setFormCatalogueKpiId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un KPI du catalogue" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCatalogue.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.nom} ({c.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            ) : isDirecteur ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">KPI (catalogue stratégique)</label>
                  <Select value={formCatalogueKpiId} onValueChange={setFormCatalogueKpiId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un KPI du catalogue" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCatalogue.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nom} ({c.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {kpiServiceOptions.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">KPI de référence (optionnel)</label>
                    <Select value={formKpiRefId || '__none__'} onValueChange={(v) => setFormKpiRefId(v === '__none__' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Aucun" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Aucun</SelectItem>
                        {kpiServiceOptions.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.catalogueKpi.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            ) : (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {employe.role === 'CHEF_SERVICE' ? 'KPI de la direction' : 'KPI Service'}
                </label>
                <Select value={formKpiServiceId} onValueChange={setFormKpiServiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder={employe.role === 'CHEF_SERVICE' ? 'Choisir un KPI de la direction' : 'Choisir un KPI du service'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableKpiServices.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.catalogueKpi.nom} ({s.catalogueKpi.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">Cible individuelle</label>
              <Input
                type="number"
                step="any"
                value={formCible}
                onChange={(e) => setFormCible(e.target.value)}
                placeholder={selectedKpiService ? String(selectedKpiService.cible) : selectedCatalogue ? '—' : ''}
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
              <Button onClick={handleAssign}>Assigner</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce KPI assigné ?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete && `Le KPI « ${confirmDelete.catalogueKpi.nom} » sera retiré pour cet employé.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
