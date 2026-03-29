'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Plus, Trash2, Target, User } from 'lucide-react'
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

export interface KpiDrawerProps {
  userId: number
  userName: string
  userRole: string
  serviceId: number
  managerNom: string | null
  periodeId: number
  periodeCode: string
  serviceNom: string
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

type KpiEmployeRow = {
  id: number
  cible: number
  poids: number
  statut: string
  catalogueKpi: { nom: string; unite: string | null }
}

type KpiServiceOption = {
  id: number
  cible: number
  poids: number
  catalogueKpi: { id: number; nom: string; type: string; unite: string | null }
  service?: { id: number; nom: string; code: string }
}

const STATUT_MAP: Record<string, string> = {
  DRAFT: 'Brouillon',
  NOTIFIE: 'Notifié',
  VALIDE: 'Validé',
  CLOTURE: 'Clôturé',
}

export function KpiDrawer({
  userId,
  userName,
  userRole,
  serviceId,
  managerNom,
  periodeId,
  periodeCode,
  serviceNom,
  isOpen,
  onClose,
  onUpdate,
}: KpiDrawerProps) {
  const [kpiList, setKpiList] = useState<KpiEmployeRow[]>([])
  const [kpiServiceOptions, setKpiServiceOptions] = useState<KpiServiceOption[]>([])
  const [loading, setLoading] = useState(false)
  const [formKpiServiceId, setFormKpiServiceId] = useState('')
  const [formCible, setFormCible] = useState('')
  const [formPoids, setFormPoids] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<KpiEmployeRow | null>(null)

  const fetchKpiEmploye = useCallback(async () => {
    if (!isOpen || !userId || !periodeId) return
    setLoading(true)
    const res = await fetch(`/api/kpi/employe?employeId=${userId}&periodeId=${periodeId}`)
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data?.error ?? 'Chargement KPI')
      return
    }
    const data = await res.json()
    setKpiList(data.list ?? [])
  }, [isOpen, userId, periodeId])

  const fetchKpiService = useCallback(async () => {
    if (!isOpen || !serviceId || !periodeId) return
    const res = await fetch(`/api/kpi/service?serviceId=${serviceId}&periodeId=${periodeId}`)
    if (!res.ok) return
    const data = await res.json()
    const list = data.list ?? []
    setKpiServiceOptions(list)
  }, [isOpen, serviceId, periodeId])

  useEffect(() => {
    if (isOpen) {
      fetchKpiEmploye()
      fetchKpiService()
      setFormKpiServiceId('')
      setFormCible('')
      setFormPoids('')
    }
  }, [isOpen, fetchKpiEmploye, fetchKpiService])

  const sumPoids = kpiList.reduce((s, k) => s + k.poids, 0)
  const poidsRestant = Math.max(0, 100 - sumPoids)
  const poidsOk = Math.abs(sumPoids - 100) < 0.01
  const assignedKpiServiceIds = new Set(
    kpiList.map((k) => (k as { kpiService?: { id: number } }).kpiService?.id).filter(Boolean) as number[]
  )
  const availableKpiServices = kpiServiceOptions.filter((ks) => !assignedKpiServiceIds.has(ks.id))

  const handleAssign = async () => {
    const kpiServiceId = formKpiServiceId ? parseInt(formKpiServiceId, 10) : null
    const cibleNum = parseFloat(formCible)
    const poidsNum = parseFloat(formPoids)
    if (!kpiServiceId || Number.isNaN(cibleNum) || Number.isNaN(poidsNum)) {
      toast.error('Sélectionnez un KPI, cible et poids')
      return
    }
    const ks = kpiServiceOptions.find((k) => k.id === kpiServiceId)
    if (!ks) return
    setSubmitting(true)
    const res = await fetch('/api/kpi/employe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeId: userId,
        kpiServiceId: ks.id,
        periodeId,
        cible: cibleNum,
        poids: poidsNum,
      }),
    })
    setSubmitting(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data?.error ?? 'Erreur assignation')
      return
    }
    toast.success('KPI assigné')
    setFormKpiServiceId('')
    setFormCible('')
    setFormPoids('')
    fetchKpiEmploye()
    onUpdate()
  }

  const handleDelete = async (row: KpiEmployeRow) => {
    const res = await fetch(`/api/kpi/employe/${row.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data?.error ?? 'Erreur suppression')
      return
    }
    toast.success('KPI supprimé')
    setDeleteTarget(null)
    fetchKpiEmploye()
    onUpdate()
  }

  const selectedKpiService = kpiServiceOptions.find((s) => String(s.id) === formKpiServiceId)

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30 shrink-0">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-xl">{userName}</DialogTitle>
                <DialogDescription className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-normal">{userRole}</Badge>
                  <span className="text-muted-foreground">{serviceNom}</span>
                  {managerNom && (
                    <span className="text-muted-foreground">• Manager : {managerNom}</span>
                  )}
                </DialogDescription>
                <p className="text-sm font-medium text-primary mt-2">{periodeCode}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 min-h-0">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>Répartition des poids</span>
                  <span className={poidsOk ? 'text-green-600 font-semibold' : 'text-amber-600 font-semibold'}>
                    {sumPoids.toFixed(1)}% {poidsOk ? '— OK' : `— manque ${poidsRestant.toFixed(0)}%`}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Progress value={Math.min(100, sumPoids)} className="h-2.5" />
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">KPI assignés ({kpiList.length})</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <p className="text-muted-foreground text-sm py-4">Chargement...</p>
                ) : kpiList.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4">Aucun KPI assigné.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>KPI</TableHead>
                        <TableHead className="text-right">Poids</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="w-[56px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kpiList.map((k) => (
                        <TableRow key={k.id}>
                          <TableCell className="font-medium">{k.catalogueKpi.nom}</TableCell>
                          <TableCell className="text-right">{k.poids}%</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal text-xs">
                              {STATUT_MAP[k.statut] ?? k.statut}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(k)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  Assigner un nouveau KPI
                </CardTitle>
                <p className="text-muted-foreground text-xs font-normal">Depuis les KPI du service</p>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">KPI du service</label>
                  <Select value={formKpiServiceId} onValueChange={(v) => { setFormKpiServiceId(v); setFormCible(''); setFormPoids(''); }}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Sélectionner un KPI" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableKpiServices.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.catalogueKpi.nom} ({s.catalogueKpi.type}{s.catalogueKpi.unite ? `, ${s.catalogueKpi.unite}` : ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Cible
                      {selectedKpiService?.catalogueKpi.unite && (
                        <span className="text-muted-foreground font-normal ml-1">({selectedKpiService.catalogueKpi.unite})</span>
                      )}
                    </label>
                    <Input
                      type="number"
                      step="any"
                      value={formCible}
                      onChange={(e) => setFormCible(e.target.value)}
                      placeholder={selectedKpiService ? String(selectedKpiService.cible) : '—'}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Poids (%) — restant : {poidsRestant.toFixed(0)}%
                    </label>
                    <Input
                      type="number"
                      step="0.5"
                      min={0}
                      max={100}
                      value={formPoids}
                      onChange={(e) => setFormPoids(e.target.value)}
                      placeholder="0"
                      className="h-10"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAssign}
                  disabled={submitting || !formKpiServiceId || !formCible || !formPoids}
                  className="w-full gap-2 h-10"
                >
                  <Plus className="h-4 w-4" />
                  Assigner ce KPI
                </Button>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce KPI ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `Le KPI « ${deleteTarget.catalogueKpi.nom } » sera supprimé pour ce collaborateur.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-destructive text-destructive-foreground"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
