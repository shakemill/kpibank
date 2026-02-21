'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
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
import { Plus, Pencil, Trash2 } from 'lucide-react'
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

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="sm:max-w-xl flex flex-col overflow-hidden">
          <SheetHeader>
            <SheetTitle>KPI de {userName} — {periodeCode}</SheetTitle>
            <SheetDescription>
              <Badge variant="outline" className="mt-1">{userRole}</Badge> {serviceNom}
              {managerNom && ` • Manager : ${managerNom}`}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Poids total</span>
                <span className={poidsOk ? 'text-green-600' : 'text-orange-600'}>
                  {sumPoids.toFixed(1)}% {poidsOk ? '✅' : `⚠️ (manque ${poidsRestant.toFixed(0)}%)`}
                </span>
              </div>
              <Progress value={Math.min(100, sumPoids)} className="h-2" />
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">KPI assignés ({kpiList.length})</h4>
              {loading ? (
                <p className="text-muted-foreground text-sm">Chargement...</p>
              ) : kpiList.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun KPI assigné.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>KPI</TableHead>
                      <TableHead className="text-right">Poids</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kpiList.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.catalogueKpi.nom}</TableCell>
                        <TableCell className="text-right">{k.poids}%</TableCell>
                        <TableCell>{STATUT_MAP[k.statut] ?? k.statut}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
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
            </div>

            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-sm">Assigner un nouveau KPI</h4>
              <p className="text-muted-foreground text-xs">Depuis les KPI du service</p>
              <Select value={formKpiServiceId} onValueChange={setFormKpiServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un KPI service" />
                </SelectTrigger>
                <SelectContent>
                  {availableKpiServices.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.catalogueKpi.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Cible</label>
                  <Input
                    type="number"
                    step="any"
                    value={formCible}
                    onChange={(e) => setFormCible(e.target.value)}
                    placeholder="Cible"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Poids % (restant : {poidsRestant.toFixed(0)}%)</label>
                  <Input
                    type="number"
                    step="0.5"
                    min={0}
                    max={100}
                    value={formPoids}
                    onChange={(e) => setFormPoids(e.target.value)}
                    placeholder="Poids"
                  />
                </div>
              </div>
              <Button
                onClick={handleAssign}
                disabled={submitting || !formKpiServiceId || !formCible || !formPoids}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Assigner ce KPI
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
