'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { NotationBadge } from '@/components/notation/NotationBadge'
import { GrilleReference } from '@/components/notation/GrilleReference'
import { useNotationGrille } from '@/contexts/notation-grille-context'
import { cn } from '@/lib/utils'
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowLeft, Plus, Trash2, Send, ChevronDown, AlertCircle, BarChart3, TrendingDown, TrendingUp, MessageSquareQuote } from 'lucide-react'

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
type RealisationMois = {
  mois: number
  valeur: number | null
  statut: string | null
  taux: number | null
}
type MoisPeriode = { mois: number; annee: number; label: string }
type ScoreMois = MoisPeriode & { scorePct: number }
type PerformancePeriode = {
  scoreGlobal: number | null
  scoreParMois: ScoreMois[]
  moisPeriode: MoisPeriode[]
}
type KpiEmployeRow = {
  id: number
  cible: number
  poids: number
  statut: string
  catalogueKpi: { nom: string; unite: string | null }
  kpiService?: { id: number } | null
  realise_cumule?: number | null
  realise_mois_courant?: number | null
  taux_atteinte?: number | null
  statut_saisie_mois?: string | null
  realisations_par_mois?: RealisationMois[]
}

const STATUT_SAISIE_MAP: Record<string, { label: string; className: string }> = {
  VALIDEE: { label: 'Validée', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  AJUSTEE: { label: 'Ajustée', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  SOUMISE: { label: 'Soumise', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  OUVERTE: { label: 'En cours', className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  EN_RETARD: { label: 'En retard', className: 'bg-red-500/10 text-red-700 dark:text-red-400' },
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

function libellerKpiOption(c: { nom: string; type: string; unite?: string | null }) {
  return `${c.nom} (${c.type}${c.unite ? `, ${c.unite}` : ''})`
}

function CatalogueKpiCombobox({
  open,
  onOpenChange,
  items,
  selectedId,
  onSelect,
  placeholder = 'Choisir un KPI du catalogue',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: CatalogueOption[]
  selectedId: string
  onSelect: (id: string) => void
  placeholder?: string
}) {
  const selected = items.find((c) => String(c.id) === selectedId)
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-auto min-h-9 py-2 whitespace-normal text-left items-start gap-2"
        >
          <span className="flex-1 text-left break-words leading-snug">
            {selected ? libellerKpiOption(selected) : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50 mt-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-[min(100vw-2rem,32rem)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher un KPI..." />
          <CommandList className="max-h-64">
            <CommandEmpty>Aucun KPI trouvé.</CommandEmpty>
            <CommandGroup>
              {items.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.nom} ${c.type} ${c.unite ?? ''}`}
                  className="whitespace-normal items-start py-2.5 cursor-pointer"
                  onSelect={() => onSelect(String(c.id))}
                >
                  <span className="break-words leading-snug">{libellerKpiOption(c)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default function AssignationEmployePage() {
  const params = useParams()
  const router = useRouter()
  const { getNotation } = useNotationGrille()
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
  const [performance, setPerformance] = useState<PerformancePeriode | null>(null)
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
  const [catalogueComboboxOpen, setCatalogueComboboxOpen] = useState(false)

  const fetchEmploye = useCallback(async () => {
    if (Number.isNaN(userId) || periodeId == null) return
    setLoadingKpi(true)
    const res = await fetch(
      `/api/kpi/employe/assignation-context?employeId=${userId}&periodeId=${periodeId}`
    )
    setLoadingKpi(false)
    if (res.status === 403) {
      toast({ title: 'Accès refusé', description: 'Cet employé n\'est pas dans votre équipe', variant: 'destructive' })
      router.replace('/manager/assignation')
      return
    }
    if (!res.ok) return
    const data = await res.json()
    setEmploye(data.employe ?? null)
    setKpiList(data.list ?? [])
    setKpiServiceOptions(data.kpiServiceOptions ?? [])
    setCatalogueOptions(data.catalogueOptions ?? [])
    setPerformance(data.performance ?? null)
  }, [userId, periodeId, router])

  const fetchPeriodes = useCallback(async () => {
    const res = await fetch('/api/periodes')
    if (!res.ok) return
    const data = await res.json()
    setPeriodes(data)
    const enCours = data.find((p: Periode) => p.statut === 'EN_COURS')
    if (data.length > 0 && !periodeId) setPeriodeId(enCours ? enCours.id : data[0].id)
  }, [periodeId])

  useEffect(() => {
    if (Number.isNaN(userId)) return
    let cancelled = false
    setLoading(true)
    fetchPeriodes().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [userId, fetchPeriodes])

  useEffect(() => {
    if (periodeId != null) fetchEmploye()
  }, [periodeId, fetchEmploye])

  const isDirecteur = employe?.role === 'DIRECTEUR'
  const drafts = kpiList.filter((k) => k.statut === 'DRAFT')
  const sumDraft = drafts.reduce((s, k) => s + k.poids, 0)
  const gestionParPoids =
    kpiList.some((k) => k.kpiService != null) || kpiServiceOptions.length > 0
  const canNotify =
    drafts.length > 0 &&
    (!gestionParPoids || Math.abs(sumDraft - 100) < 0.01)
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
  const sansDirection = employe != null && employe.directionId == null
  const hasAssignationSources = availableKpiServices.length > 0 || availableCatalogue.length > 0
  const canAddKpi =
    periodeId != null &&
    !sansDirection &&
    hasAssignationSources &&
    (isDirecteur ||
      rattacheDirect ||
      (employe?.role === 'CHEF_SERVICE' &&
        (employe?.serviceId != null || employe?.directionId != null)) ||
      employe?.role === 'EMPLOYE' ||
      employe?.role === 'MANAGER')

  const openAdd = () => {
    setFormKpiServiceId('')
    setFormCatalogueKpiId('')
    setFormKpiRefId('')
    setFormCible('')
    setFormPoids('')
    setCatalogueComboboxOpen(false)
    setModalOpen(true)
  }

  const isAssignationViaCatalogue =
    isDirecteur ||
    (rattacheDirect && !formKpiServiceId) ||
    formKpiServiceId === '__catalogue__' ||
    (!formKpiServiceId && !!formCatalogueKpiId) ||
    availableKpiServices.length === 0

  const handleAssign = async () => {
    if (Number.isNaN(userId) || periodeId == null) return
    const cibleNum = parseFloat(formCible)
    const viaCatalogue =
      isDirecteur ||
      (rattacheDirect && !formKpiServiceId) ||
      formKpiServiceId === '__catalogue__' ||
      (!formKpiServiceId && !!formCatalogueKpiId)
    const poidsNum = viaCatalogue ? 0 : parseFloat(formPoids)
    if (Number.isNaN(cibleNum) || (!viaCatalogue && Number.isNaN(poidsNum))) {
      toast({ title: viaCatalogue ? 'Cible requise' : 'Cible et poids requis', variant: 'destructive' })
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
      if (formKpiServiceId && formKpiServiceId !== '__catalogue__') {
        body.kpiServiceId = parseInt(formKpiServiceId, 10)
      } else if (formCatalogueKpiId) {
        body.catalogueKpiId = parseInt(formCatalogueKpiId, 10)
      } else {
        toast({ title: 'Sélectionnez un KPI du catalogue ou un KPI de référence', variant: 'destructive' })
        return
      }
    } else if (formKpiServiceId === '__catalogue__' || (!formKpiServiceId && formCatalogueKpiId)) {
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
    fetchEmploye()
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
    fetchEmploye()
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
    fetchEmploye()
  }

  if (Number.isNaN(userId)) return null
  if (loading || (periodeId != null && !employe && loadingKpi)) {
    return <div className="p-6">Chargement...</div>
  }
  if (!employe) {
    return <div className="p-6">Employé introuvable.</div>
  }

  const isManagerOrDirecteur = employe.role === 'MANAGER' || employe.role === 'DIRECTEUR'
  const periodeCode = periodes.find((p) => p.id === periodeId)?.code ?? ''
  const kpisAvecTaux = kpiList.filter((k) => k.taux_atteinte != null)
  const scoreMoyenKpi =
    kpisAvecTaux.length > 0
      ? Math.round(
          (kpisAvecTaux.reduce((s, k) => s + (k.taux_atteinte ?? 0), 0) / kpisAvecTaux.length) * 10
        ) / 10
      : null
  const displayScore = performance?.scoreGlobal ?? scoreMoyenKpi
  const scoreParMoisChart = (performance?.scoreParMois ?? []).map((s) => ({
    ...s,
    score: s.scorePct > 0 ? s.scorePct : null,
  }))
  const hasMonthlyScores = scoreParMoisChart.some((s) => s.score != null && s.score > 0)
  const moisAvecScore = scoreParMoisChart.filter((s) => s.score != null && s.score > 0)
  const tendanceMensuelle =
    moisAvecScore.length >= 2
      ? Math.round((moisAvecScore[moisAvecScore.length - 1].score - moisAvecScore[0].score) * 10) / 10
      : null
  const notationGlobale = displayScore != null ? getNotation(displayScore) : null
  const radialGaugeData =
    displayScore != null
      ? [
          {
            name: 'Score',
            value: Math.min(100, Math.max(0, displayScore)),
            fill: notationGlobale?.chartColor ?? '#3b82f6',
          },
        ]
      : []

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
          ) : sansDirection ? (
            <div className="space-y-1 text-sm">
              <p className="text-amber-700 dark:text-amber-400 font-medium">
                Cet utilisateur n&apos;est rattaché à aucune direction.
              </p>
              <p className="text-muted-foreground">
                Rattachez-le à un service ou une direction dans Organisation → Utilisateurs avant d&apos;assigner des KPI.
              </p>
              {employe.manager && (
                <p>
                  <span className="text-muted-foreground">Manager direct :</span>{' '}
                  {employe.manager.prenom} {employe.manager.nom}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              {employe.direction && (
                <p>
                  <span className="text-muted-foreground">Direction :</span>{' '}
                  <strong>{employe.direction.nom}</strong>
                  {employe.direction.code ? ` (${employe.direction.code})` : ''}
                </p>
              )}
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
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Button onClick={openAdd} disabled={!canAddKpi} className="gap-2">
              <Plus className="h-4 w-4" />
              Assigner un KPI
            </Button>
            {!sansDirection && !hasAssignationSources && periodeId != null && !loadingKpi && (
              <span className="text-sm text-amber-600 dark:text-amber-400">
                Aucun KPI disponible pour la direction {employe?.direction?.nom ?? ''} — affectez des KPI au catalogue de la direction (Organisation) ou créez des KPI département.
              </span>
            )}
            {sansDirection && (
              <span className="text-sm text-amber-600 dark:text-amber-400">
                Assignation impossible : l&apos;utilisateur doit être rattaché à une direction.
              </span>
            )}
            <Button
              onClick={handleNotifier}
              disabled={!canNotify || notifying}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {notifying ? 'Envoi...' : 'Notifier l\'employé'}
            </Button>
            {drafts.length > 0 && !canNotify && gestionParPoids && (
              <span className="text-sm text-muted-foreground">
                (Somme des brouillons : {sumDraft.toFixed(1)}% — doit être 100% pour notifier)
              </span>
            )}
          </div>
          {gestionParPoids && (
            <p className="text-sm text-muted-foreground mb-2">
              Poids restant : <strong>{poidsRestant.toFixed(1)}%</strong>
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="min-w-[200px]">KPI</TableHead>
                <TableHead>Cible</TableHead>
                <TableHead>Unité</TableHead>
                {gestionParPoids && <TableHead>Poids</TableHead>}
                <TableHead>Statut</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kpiList.map((k, idx) => {
                const unite = k.catalogueKpi.unite
                const stripe = idx % 2 === 1
                return (
                <TableRow
                  key={k.id}
                  className={cn(
                    stripe ? 'bg-muted/40 hover:bg-muted/55' : 'hover:bg-muted/25'
                  )}
                >
                  <TableCell className="font-medium max-w-sm whitespace-normal break-words leading-snug">
                    {k.catalogueKpi.nom}
                  </TableCell>
                  <TableCell>{k.cible}</TableCell>
                  <TableCell>{unite ?? '—'}</TableCell>
                  {gestionParPoids && <TableCell>{k.poids}%</TableCell>}
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
                    {k.statut === 'CONTESTE' && (
                      <Button variant="outline" size="sm" className="gap-1" asChild>
                        <Link href="/manager/assignation/contestations">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Traiter
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {kpiList.length === 0 && periodeId != null && (
            <p className="text-muted-foreground py-4">Aucun KPI assigné pour cette période.</p>
          )}
        </CardContent>
      </Card>

      {performance && kpiList.length > 0 && (
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Réalisations sur la période
              {periodeCode && (
                <Badge variant="outline" className="font-normal ml-1">
                  {periodeCode}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Scores, appréciations et commentaires selon la grille de notation configurée
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div
                className="rounded-xl border overflow-hidden"
                style={{
                  borderColor: notationGlobale ? `${notationGlobale.chartColor}35` : undefined,
                }}
              >
                <div
                  className="p-5 flex flex-col sm:flex-row items-center gap-6"
                  style={{
                    background: notationGlobale
                      ? `linear-gradient(135deg, ${notationGlobale.chartColor}14 0%, transparent 65%)`
                      : undefined,
                  }}
                >
                  <div className="relative w-56 h-40 shrink-0">
                    {displayScore != null ? (
                      <>
                        <ResponsiveContainer width="100%" height="100%">
                          <RadialBarChart
                            innerRadius="68%"
                            outerRadius="100%"
                            data={radialGaugeData}
                            startAngle={200}
                            endAngle={-20}
                            cx="50%"
                            cy="72%"
                          >
                            <RadialBar
                              dataKey="value"
                              cornerRadius={12}
                              background={{ fill: 'hsl(var(--muted))' }}
                            />
                          </RadialBarChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-x-0 bottom-4 text-center pointer-events-none">
                          <span
                            className="text-2xl font-bold tabular-nums tracking-tight leading-none"
                            style={{ color: notationGlobale?.chartColor }}
                          >
                            {displayScore.toFixed(1)}
                          </span>
                          <span className="text-sm text-muted-foreground ml-0.5">%</span>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 flex justify-between px-3 text-[10px] text-muted-foreground pointer-events-none">
                          <span>0</span>
                          <span>50</span>
                          <span>100</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-center px-4">
                        <p className="text-sm text-muted-foreground">
                          Aucune saisie pour afficher le score global
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-3 text-center sm:text-left w-full">
                    <div>
                      <p className="text-sm font-semibold">Performance globale</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {!gestionParPoids && scoreMoyenKpi != null ? 'Moyenne des taux KPI' : 'Score consolidé'}
                      </p>
                    </div>
                    {displayScore != null && notationGlobale && (
                      <>
                        <NotationBadge taux={displayScore} showTaux />
                        <div
                          className="rounded-lg border p-3 flex gap-2.5 text-left"
                          style={{
                            borderColor: `${notationGlobale.chartColor}25`,
                            backgroundColor: `${notationGlobale.chartColor}08`,
                          }}
                        >
                          <MessageSquareQuote className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                          <div className="space-y-1 min-w-0">
                            <p className="text-xs font-medium" style={{ color: notationGlobale.chartColor }}>
                              {notationGlobale.appreciation}
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {notationGlobale.commentaire}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                    {gestionParPoids && performance?.scoreGlobal == null && scoreMoyenKpi != null && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Score provisoire — KPI non encore tous validés
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {hasMonthlyScores ? (
                <div className="rounded-xl border p-4 flex flex-col">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-sm font-semibold">Évolution mensuelle</p>
                      <p className="text-xs text-muted-foreground">
                        {gestionParPoids ? 'Score pondéré par mois' : 'Score moyen par mois'}
                      </p>
                    </div>
                    {tendanceMensuelle != null && tendanceMensuelle !== 0 && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                          tendanceMensuelle > 0
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                            : 'bg-red-500/10 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {tendanceMensuelle > 0 ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {tendanceMensuelle > 0 ? '+' : ''}
                        {tendanceMensuelle.toFixed(1)} pts
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={scoreParMoisChart}
                        margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
                      >
                        <defs>
                          <linearGradient id="scoreMoisGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 120]}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={false}
                          tickLine={false}
                          width={34}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid hsl(var(--border))',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null
                            const score = payload[0]?.payload?.score as number | null
                            if (score == null || score <= 0) return null
                            const n = getNotation(score)
                            return (
                              <div className="rounded-lg border bg-background p-3 shadow-md text-xs max-w-[220px]">
                                <p className="font-medium mb-1">{label}</p>
                                <p className={cn('text-base font-bold tabular-nums', n.textClassName)}>
                                  {score.toFixed(1)}%
                                </p>
                                <p className="text-muted-foreground mt-1">{n.appreciation}</p>
                                <p className="text-muted-foreground mt-0.5 leading-relaxed">{n.commentaire}</p>
                              </div>
                            )
                          }}
                        />
                        <ReferenceLine
                          y={100}
                          stroke="hsl(var(--muted-foreground))"
                          strokeDasharray="4 4"
                          strokeOpacity={0.5}
                          label={{ value: '100%', position: 'insideTopRight', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="score"
                          stroke="none"
                          fill="url(#scoreMoisGradient)"
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2.5}
                          dot={(props) => {
                            const { cx, cy, payload, index } = props
                            if (payload.score == null || payload.score <= 0) return null
                            const color = getNotation(payload.score).chartColor
                            return (
                              <circle
                                key={`score-dot-${payload.mois ?? index}`}
                                cx={cx}
                                cy={cy}
                                r={5}
                                fill={color}
                                stroke="hsl(var(--background))"
                                strokeWidth={2}
                              />
                            )
                          }}
                          activeDot={{ r: 7 }}
                          connectNulls
                        />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={28} fillOpacity={0.25}>
                          {scoreParMoisChart.map((entry, index) => (
                            <Cell
                              key={index}
                              fill={
                                entry.score != null && entry.score > 0
                                  ? getNotation(entry.score).chartColor
                                  : 'transparent'
                              }
                            />
                          ))}
                        </Bar>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t text-xs">
                    {scoreParMoisChart
                      .filter((s) => s.score != null && s.score > 0)
                      .map((s) => {
                        const n = getNotation(s.score!)
                        return (
                          <div
                            key={s.mois}
                            className="rounded-lg border px-2.5 py-1.5 flex flex-col gap-0.5 min-w-[100px]"
                            style={{
                              borderColor: `${n.chartColor}30`,
                              backgroundColor: `${n.chartColor}08`,
                            }}
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className="inline-block w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: n.chartColor }}
                              />
                              <span className="text-muted-foreground">{s.label}</span>
                              <span className={cn('font-semibold tabular-nums ml-auto', n.textClassName)}>
                                {s.score!.toFixed(1)}%
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground pl-3.5 truncate">
                              {n.appreciation}
                            </span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-5 flex items-center justify-center text-center min-h-[200px]">
                  <p className="text-sm text-muted-foreground">
                    Les scores mensuels apparaîtront dès que des saisies seront enregistrées
                  </p>
                </div>
              )}
            </div>

            <GrilleReference
              variant="officielle"
              collapsible
              defaultOpen={false}
              description="Référentiel utilisé pour les appréciations et commentaires ci-dessous"
            />

            <div className="overflow-x-auto -mx-1 px-1 rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="min-w-[180px] sticky left-0 bg-muted/50 z-10">KPI</TableHead>
                    <TableHead className="text-right">Cible</TableHead>
                    {performance.moisPeriode.map((m) => (
                      <TableHead key={m.mois} className="text-right min-w-[80px] whitespace-nowrap text-xs">
                        {m.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-right min-w-[88px] whitespace-nowrap">Global</TableHead>
                    <TableHead className="min-w-[200px]">Appréciation & commentaire</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpiList.map((k, idx) => {
                    const unite = k.catalogueKpi.unite
                    const fmt = (v: number | null | undefined) =>
                      v != null ? `${Number(v).toFixed(1)}${unite ? ` ${unite}` : ''}` : '—'
                    const parMois = k.realisations_par_mois ?? []
                    const kpiNotation = k.taux_atteinte != null ? getNotation(k.taux_atteinte) : null
                    const stripe = idx % 2 === 1
                    return (
                      <TableRow
                        key={k.id}
                        className={cn(
                          'group',
                          stripe ? 'bg-muted/40 hover:bg-muted/55' : 'hover:bg-muted/25'
                        )}
                      >
                        <TableCell
                          className={cn(
                            'font-medium max-w-xs whitespace-normal break-words leading-snug sticky left-0 z-10 transition-colors',
                            stripe
                              ? 'bg-muted/40 group-hover:bg-muted/55'
                              : 'bg-background group-hover:bg-muted/25'
                          )}
                        >
                          {k.catalogueKpi.nom}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{k.cible}</TableCell>
                        {performance.moisPeriode.map((m) => {
                          const rm = parMois.find((r) => r.mois === m.mois)
                          const statutSaisie = rm?.statut ? STATUT_SAISIE_MAP[rm.statut] : null
                          const moisNotation = rm?.taux != null ? getNotation(rm.taux) : null
                          const affichageMois =
                            rm?.taux != null ? `${rm.taux.toFixed(1)}%` : fmt(rm?.valeur)
                          return (
                            <TableCell key={m.mois} className="text-right align-top p-2">
                              <div className="flex flex-col items-end gap-0.5">
                                <span
                                  className={cn(
                                    'tabular-nums text-sm font-medium',
                                    moisNotation?.textClassName
                                  )}
                                >
                                  {affichageMois}
                                </span>
                                {statutSaisie && rm?.statut !== 'VALIDEE' && rm?.statut !== 'AJUSTEE' && (
                                  <Badge className={`${statutSaisie.className} text-[10px] px-1 py-0 w-fit`}>
                                    {statutSaisie.label}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          )
                        })}
                        <TableCell className="text-right tabular-nums font-semibold">
                          {fmt(k.realise_cumule)}
                        </TableCell>
                        <TableCell className="align-top">
                          {kpiNotation ? (
                            <div className="space-y-1.5">
                              <NotationBadge taux={k.taux_atteinte!} showTaux variant="text" />
                              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                                {kpiNotation.commentaire}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {hasMonthlyScores && (
                    <TableRow className="bg-muted/60 hover:bg-muted/60 font-medium border-t-2">
                      <TableCell className="sticky left-0 bg-muted/60 z-10">Score mensuel</TableCell>
                      <TableCell />
                      {performance.scoreParMois.map((s) => {
                        const n = s.scorePct > 0 ? getNotation(s.scorePct) : null
                        return (
                          <TableCell key={s.mois} className="text-right p-2">
                            {n ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className={cn('tabular-nums text-sm', n.textClassName)}>
                                  {s.scorePct.toFixed(1)}%
                                </span>
                                <span className="text-[10px] text-muted-foreground">{n.appreciation}</span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                        )
                      })}
                      <TableCell className="text-right">
                        {displayScore != null ? (
                          <span className={cn('font-semibold tabular-nums', notationGlobale?.textClassName)}>
                            {displayScore.toFixed(1)}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {notationGlobale && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            <span className="font-medium text-foreground">{notationGlobale.appreciation}</span>
                            {' — '}
                            {notationGlobale.commentaire}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assigner un KPI</DialogTitle>
            {gestionParPoids && !isAssignationViaCatalogue && (
              <p className="text-sm text-muted-foreground">
                Poids restant : <strong>{poidsRestant.toFixed(1)}%</strong>
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            {rattacheDirect ? (
              <>
                {kpiServiceOptions.length > 0 && (
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
                )}
                {!formKpiServiceId && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">KPI (catalogue direction)</label>
                    <CatalogueKpiCombobox
                      open={catalogueComboboxOpen}
                      onOpenChange={setCatalogueComboboxOpen}
                      items={availableCatalogue}
                      selectedId={formCatalogueKpiId}
                      onSelect={(id) => {
                        setFormCatalogueKpiId(id)
                        setCatalogueComboboxOpen(false)
                      }}
                    />
                  </div>
                )}
              </>
            ) : isDirecteur ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">KPI (catalogue direction)</label>
                  <CatalogueKpiCombobox
                    open={catalogueComboboxOpen}
                    onOpenChange={setCatalogueComboboxOpen}
                    items={availableCatalogue}
                    selectedId={formCatalogueKpiId}
                    onSelect={(id) => {
                      setFormCatalogueKpiId(id)
                      setCatalogueComboboxOpen(false)
                    }}
                  />
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
              <>
                {availableKpiServices.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {employe.role === 'CHEF_SERVICE' ? 'KPI de la direction' : 'KPI du département'}
                    </label>
                    <Select
                      value={formKpiServiceId || (availableCatalogue.length > 0 ? '__catalogue__' : '')}
                      onValueChange={(v) => {
                        setFormKpiServiceId(v)
                        if (v === '__catalogue__') setFormCatalogueKpiId('')
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir un KPI" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableKpiServices.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)} className="whitespace-normal items-start py-2">
                            <span className="break-words leading-snug">
                              {s.catalogueKpi.nom} ({s.catalogueKpi.type})
                            </span>
                          </SelectItem>
                        ))}
                        {availableCatalogue.length > 0 && (
                          <SelectItem value="__catalogue__">KPI personnel (catalogue direction)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {(formKpiServiceId === '__catalogue__' || availableKpiServices.length === 0) &&
                  availableCatalogue.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">KPI (catalogue direction)</label>
                    <CatalogueKpiCombobox
                      open={catalogueComboboxOpen}
                      onOpenChange={setCatalogueComboboxOpen}
                      items={availableCatalogue}
                      selectedId={formCatalogueKpiId}
                      onSelect={(id) => {
                        setFormCatalogueKpiId(id)
                        setCatalogueComboboxOpen(false)
                      }}
                    />
                  </div>
                )}
              </>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Cible individuelle
                {(selectedKpiService?.catalogueKpi.unite ?? selectedCatalogue?.unite) && (
                  <span className="text-muted-foreground font-normal ml-1">
                    ({selectedKpiService?.catalogueKpi.unite ?? selectedCatalogue?.unite})
                  </span>
                )}
              </label>
              <Input
                type="number"
                step="any"
                value={formCible}
                onChange={(e) => setFormCible(e.target.value)}
                placeholder={selectedKpiService ? String(selectedKpiService.cible) : selectedCatalogue ? '—' : ''}
              />
            </div>
            {!isAssignationViaCatalogue && (
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
            )}
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
