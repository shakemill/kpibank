'use client'

import { useCallback, useEffect, useMemo, useState, Fragment } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { AlertTriangle, Target, Plus, CheckCircle, ClipboardList, Eye, Users, BarChart3, Building2, Briefcase } from 'lucide-react'
import { KpiDrawer } from '@/components/assignation/KpiDrawer'
import { ValidationRapideModal } from '@/components/validation/ValidationRapideModal'
import { libellerRole } from '@/lib/role-labels'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'

type EmployeRow = {
  id: number
  nom: string
  prenom: string
  email: string
  role: string
  directionId: number | null
  directionNom: string | null
  serviceId: number | null
  serviceNom: string | null
  scoreGlobal: number
  statutSaisieMois: string
  kpiTotalAssignes: number
  sommePoids: number
}

type ServiceGroup = {
  serviceId: number | null
  serviceNom: string
  membres: EmployeRow[]
}

type DirectionGroup = {
  directionId: number | null
  directionNom: string
  services: ServiceGroup[]
}

function groupEmployesByDirectionService(employes: EmployeRow[]): DirectionGroup[] {
  const directionMap = new Map<string, DirectionGroup>()

  for (const e of employes) {
    const directionNom = e.directionNom ?? 'Sans direction'
    const directionKey = e.directionId != null ? String(e.directionId) : directionNom
    let direction = directionMap.get(directionKey)
    if (!direction) {
      direction = {
        directionId: e.directionId,
        directionNom,
        services: [],
      }
      directionMap.set(directionKey, direction)
    }

    const serviceNom = e.serviceNom ?? 'Sans service / département'
    const serviceKey = e.serviceId != null ? String(e.serviceId) : serviceNom
    let service = direction.services.find(
      (s) => (s.serviceId != null ? String(s.serviceId) : s.serviceNom) === serviceKey
    )
    if (!service) {
      service = { serviceId: e.serviceId, serviceNom, membres: [] }
      direction.services.push(service)
    }
    service.membres.push(e)
  }

  return [...directionMap.values()]
    .sort((a, b) => a.directionNom.localeCompare(b.directionNom, 'fr'))
    .map((d) => ({
      ...d,
      services: [...d.services]
        .sort((a, b) => a.serviceNom.localeCompare(b.serviceNom, 'fr'))
        .map((s) => ({
          ...s,
          membres: [...s.membres].sort(
            (a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr')
          ),
        })),
    }))
}

type ApiResponse = {
  periodeId: number
  periodeCode: string
  perimetreLabel?: string
  viewerRole?: string
  employes: EmployeRow[]
  alertes: {
    employesSansKpi: { id: number; nom: string; prenom: string }[]
    saisiesManquantes: { id: number; nom: string; prenom: string; statut: string }[]
  }
}

const STATUT_SAISIE_MAP: Record<string, { label: string; className: string }> = {
  VALIDEE: { label: 'Validée', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  SOUMISE: { label: 'Soumise', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  OUVERTE: { label: 'En cours', className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  MANQUANTE: { label: 'Manquante', className: 'bg-red-500/10 text-red-700 dark:text-red-400' },
  EN_RETARD: { label: 'Manquante', className: 'bg-red-500/10 text-red-700 dark:text-red-400' },
}

function kpiAssignesLabel(kpiTotalAssignes: number, sommePoids: number): { text: string; ok: boolean } {
  if (kpiTotalAssignes === 0) return { text: 'Aucun KPI', ok: false }
  const pct = Math.round(sommePoids)
  if (Math.abs(sommePoids - 100) < 0.5) return { text: `${kpiTotalAssignes} KPI — ${pct}%`, ok: true }
  return { text: `${kpiTotalAssignes} KPI — ${pct}%`, ok: false }
}

export default function ManagerEquipePage() {
  const { data: session } = useSession()
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [periodes, setPeriodes] = useState<{ id: number; code: string }[]>([])
  const [drawerUser, setDrawerUser] = useState<EmployeRow | null>(null)
  const [validationUser, setValidationUser] = useState<{ id: number; name: string } | null>(null)

  const viewerRole = (session?.user as { role?: string } | undefined)?.role ?? data?.viewerRole ?? 'MANAGER'
  const showRoleColumn = viewerRole === 'DIRECTEUR' || viewerRole === 'DG'
  const showRapportLink = viewerRole === 'DIRECTEUR' || viewerRole === 'DG'

  const groupedEmployes = useMemo(
    () => (data ? groupEmployesByDirectionService(data.employes) : []),
    [data]
  )
  const hasMultipleDirections = groupedEmployes.length > 1
  const serviceCount = groupedEmployes.reduce((n, d) => n + d.services.length, 0)
  const hasMultipleServices = serviceCount > 1
  const showServiceColumn = !hasMultipleServices

  const fetchPeriodes = useCallback(async () => {
    const res = await fetch('/api/periodes')
    if (!res.ok) return
    const list = await res.json()
    setPeriodes(list)
    const enCours = list.find((p: { statut: string }) => p.statut === 'EN_COURS')
    if (list.length > 0 && periodeId == null) setPeriodeId(enCours ? enCours.id : list[0].id)
  }, [periodeId])

  const fetchEquipe = useCallback(async () => {
    const url = periodeId != null ? `/api/manager/equipe?periodeId=${periodeId}` : '/api/manager/equipe'
    const res = await fetch(url)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err?.error ?? 'Chargement équipe')
      setData(null)
      return
    }
    const json = await res.json()
    setData(json)
  }, [periodeId])

  useEffect(() => {
    let cancelled = false
    fetchPeriodes()
    return () => { cancelled = true }
  }, [fetchPeriodes])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchEquipe().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [fetchEquipe])

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Mon équipe</h1>
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Mon équipe</h1>
        <p className="text-muted-foreground">Impossible de charger les données.</p>
      </div>
    )
  }

  const colCount =
    5 + (showRoleColumn ? 1 : 0) + (showServiceColumn ? 1 : 0)

  function renderEmployeRow(row: EmployeRow, stripe: boolean) {
    const kpiLabel = kpiAssignesLabel(row.kpiTotalAssignes, row.sommePoids)
    const statutInfo = STATUT_SAISIE_MAP[row.statutSaisieMois]
    const showValider = row.statutSaisieMois === 'SOUMISE'
    const fullName = `${row.prenom} ${row.nom}`

    return (
      <TableRow
        key={row.id}
        className={cn(stripe ? 'bg-muted/30 hover:bg-muted/45' : 'hover:bg-muted/20')}
      >
        <TableCell className="font-medium">{fullName}</TableCell>
        {showRoleColumn && (
          <TableCell className="text-muted-foreground text-sm">{libellerRole(row.role)}</TableCell>
        )}
        {showServiceColumn && (
          <TableCell className="text-muted-foreground text-sm">{row.serviceNom ?? '—'}</TableCell>
        )}
        <TableCell className="text-right tabular-nums">{row.scoreGlobal.toFixed(1)} %</TableCell>
        <TableCell>
          <span className={cn(!kpiLabel.ok && 'text-amber-700 dark:text-amber-400')}>{kpiLabel.text}</span>
        </TableCell>
        <TableCell>
          <Badge className={statutInfo?.className ?? 'bg-muted'}>
            {statutInfo?.label ?? row.statutSaisieMois}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {row.serviceId && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => setDrawerUser(row)}
              >
                <ClipboardList className="h-4 w-4" />
                Gérer KPI
              </Button>
            )}
            {showValider && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => setValidationUser({ id: row.id, name: fullName })}
              >
                <CheckCircle className="h-4 w-4" />
                Valider
              </Button>
            )}
            {showRapportLink && (
              <Button variant="ghost" size="sm" asChild className="gap-1">
                <Link href={`/directeur/rapports/${row.id}?periodeId=${data.periodeId}`}>
                  <BarChart3 className="h-4 w-4" />
                  Rapport
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild className="gap-1">
              <Link href={`/manager/assignation/${row.id}`}>
                <Eye className="h-4 w-4" />
                Voir détail
              </Link>
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Mon équipe
          </h1>
          <p className="text-muted-foreground">
            {data.perimetreLabel ?? 'Collaborateurs de votre périmètre'} — {data.periodeCode}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={periodeId?.toString() ?? ''}
            onValueChange={(v) => setPeriodeId(v ? parseInt(v, 10) : null)}
            disabled={loading}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              {periodes.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/manager/assignation">
              <Plus className="h-4 w-4" />
              Assigner des KPI
            </Link>
          </Button>
          <Button asChild variant="secondary" className="gap-2">
            <Link href="/manager/validation">
              <CheckCircle className="h-4 w-4" />
              Valider les saisies
            </Link>
          </Button>
        </div>
      </div>

      {data.alertes.employesSansKpi.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Sans KPI assigné
                  </p>
                  <p className="text-3xl font-bold tabular-nums mt-0.5">
                    {data.alertes.employesSansKpi.length}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    collaborateur{data.alertes.employesSansKpi.length > 1 ? 's' : ''} sans aucun KPI
                    sur {data.periodeCode}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button variant="outline" asChild className="gap-2">
                  <Link
                    href={`/manager/equipe/sans-kpi${periodeId != null ? `?periodeId=${periodeId}` : ''}`}
                  >
                    <Eye className="h-4 w-4" />
                    Voir le tableau
                  </Link>
                </Button>
                <Button asChild className="gap-2">
                  <Link href="/manager/assignation">
                    <Target className="h-4 w-4" />
                    Définir les KPI
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {data.alertes.saisiesManquantes.length > 0 && data.alertes.employesSansKpi.length === 0 && (
        <Card className="border-border/60">
          <CardContent className="pt-5 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Saisies manquantes ou en retard</p>
              <p className="text-2xl font-bold tabular-nums mt-0.5">
                {data.alertes.saisiesManquantes.length}
              </p>
            </div>
            <Button variant="outline" asChild className="gap-2">
              <Link href="/manager/validation">
                <CheckCircle className="h-4 w-4" />
                Relancer / valider
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Collaborateurs</CardTitle>
          <p className="text-muted-foreground text-sm">
            Classés par direction et service — KPI assignés et statut de saisie du mois en cours.
          </p>
        </CardHeader>
        <CardContent>
          {data.employes.length === 0 ? (
            <p className="text-muted-foreground py-4">Aucun collaborateur dans votre équipe.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Collaborateur</TableHead>
                    {showRoleColumn && <TableHead>Rôle</TableHead>}
                    {showServiceColumn && <TableHead>Service</TableHead>}
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>KPI assignés</TableHead>
                    <TableHead>Statut saisie</TableHead>
                    <TableHead className="w-[260px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedEmployes.map((direction) => (
                    <Fragment key={direction.directionId ?? direction.directionNom}>
                      {hasMultipleDirections && (
                        <TableRow className="bg-primary/5 hover:bg-primary/5 border-t-2">
                          <TableCell colSpan={colCount} className="py-2">
                            <div className="flex items-center gap-2 font-semibold text-sm">
                              <Building2 className="h-4 w-4 text-primary shrink-0" />
                              {direction.directionNom}
                              <Badge variant="secondary" className="font-normal">
                                {direction.services.reduce((n, s) => n + s.membres.length, 0)} collab.
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {direction.services.map((service) => (
                        <Fragment key={service.serviceId ?? service.serviceNom}>
                          {hasMultipleServices && (
                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                              <TableCell colSpan={colCount} className="py-1.5 pl-6">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                  <Briefcase className="h-3.5 w-3.5 shrink-0" />
                                  {service.serviceNom}
                                  <span className="text-xs font-normal">
                                    ({service.membres.length})
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          {service.membres.map((row, idx) =>
                            renderEmployeRow(row, idx % 2 === 1)
                          )}
                        </Fragment>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Button asChild variant="outline" className="gap-2">
        <Link href="/manager/assignation">
          <Target className="h-4 w-4" />
          Assigner des KPI à mon équipe
        </Link>
      </Button>

      {drawerUser && drawerUser.serviceId && (
        <KpiDrawer
          userId={drawerUser.id}
          userName={`${drawerUser.prenom} ${drawerUser.nom}`}
          userRole={libellerRole(drawerUser.role)}
          serviceId={drawerUser.serviceId}
          managerNom={null}
          periodeId={data.periodeId}
          periodeCode={data.periodeCode}
          serviceNom={drawerUser.serviceNom ?? ''}
          isOpen={!!drawerUser}
          onClose={() => setDrawerUser(null)}
          onUpdate={() => fetchEquipe()}
        />
      )}

      {validationUser && (
        <ValidationRapideModal
          employeId={validationUser.id}
          employeName={validationUser.name}
          mois={new Date().getMonth() + 1}
          annee={new Date().getFullYear()}
          isOpen={!!validationUser}
          onClose={() => setValidationUser(null)}
          onUpdate={() => fetchEquipe()}
        />
      )}
    </div>
  )
}
