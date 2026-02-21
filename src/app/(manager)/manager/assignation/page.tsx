'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
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
import { Users, Calendar, Settings, Link2 } from 'lucide-react'

type Periode = { id: number; code: string; type: string; statut: string }

type CollaborateurRow = {
  id: number
  nom: string
  prenom: string
  email: string
  role: string
  serviceId: number | null
  directionId: number | null
  service: { id: number; nom: string; code: string } | null
  direction: { id: number; nom: string; code: string } | null
  manager: { id: number; nom: string; prenom: string } | null
  nbKpiAssignes: number
  sommePoids: number
  poidsOk: boolean
  statutGlobal: string
}

type Grouped = {
  rattachesDirects: CollaborateurRow[]
  directeurs: CollaborateurRow[]
  chefsService: CollaborateurRow[]
  managers: CollaborateurRow[]
  employes: CollaborateurRow[]
}

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  EMPLOYE: { label: 'Employé', className: 'bg-muted text-muted-foreground' },
  MANAGER: { label: 'Manager', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  CHEF_SERVICE: { label: 'Chef de service', className: 'bg-violet-500/10 text-violet-700 dark:text-violet-400' },
  DIRECTEUR: { label: 'Directeur', className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  DG: { label: 'DG', className: 'bg-red-500/10 text-red-700 dark:text-red-400' },
}

const STATUT_GLOBAL_LABEL: Record<string, string> = {
  OK: 'Tous validés',
  CONTESTATIONS: 'Contestations en cours',
  EN_ATTENTE: 'En attente acceptation',
  INCOMPLET: 'Incomplet',
}

function PoidsIndicator({ row }: { row: CollaborateurRow }) {
  if (row.nbKpiAssignes === 0) {
    return <span className="text-red-600 font-medium">0% 🔴</span>
  }
  if (row.poidsOk) {
    return <span className="text-green-600 font-medium">{row.sommePoids.toFixed(1)}% ✅</span>
  }
  return <span className="text-orange-600">{row.sommePoids.toFixed(1)}% ⚠️</span>
}

function SectionTable({
  title,
  icon,
  rows,
  router,
}: {
  title: string
  icon: React.ReactNode
  rows: CollaborateurRow[]
  router: ReturnType<typeof useRouter>
}) {
  if (rows.length === 0) return null
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground border-b pb-1">
        {icon}
        <span>{title} ({rows.length})</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead className="text-right">Nb KPI</TableHead>
            <TableHead className="text-right">Poids</TableHead>
            <TableHead>Statut global</TableHead>
            <TableHead className="w-[140px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const roleBadge = ROLE_BADGE[row.role] ?? { label: row.role, className: 'bg-muted text-muted-foreground' }
            return (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.prenom} {row.nom}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={roleBadge.className}>
                    {roleBadge.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{row.nbKpiAssignes}</TableCell>
                <TableCell className="text-right">
                  <PoidsIndicator row={row} />
                </TableCell>
                <TableCell>{STATUT_GLOBAL_LABEL[row.statutGlobal] ?? row.statutGlobal}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/manager/assignation/${row.id}`)}
                  >
                    <Settings className="h-3.5 w-3.5 mr-1" />
                    Gérer ses KPI
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default function AssignationPage() {
  const router = useRouter()
  const [periodes, setPeriodes] = useState<Periode[]>([])
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [grouped, setGrouped] = useState<Grouped | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingData, setLoadingData] = useState(false)

  const fetchPeriodes = useCallback(async () => {
    const res = await fetch('/api/periodes')
    if (!res.ok) return
    const data = await res.json()
    const enCoursOuAVenir = (data ?? []).filter(
      (p: Periode) => p.statut === 'EN_COURS' || p.statut === 'A_VENIR'
    )
    setPeriodes(enCoursOuAVenir)
    if (enCoursOuAVenir.length > 0) {
      const enCours = enCoursOuAVenir.find((p: Periode) => p.statut === 'EN_COURS')
      setPeriodeId((prev) => prev ?? (enCours ? enCours.id : enCoursOuAVenir[0].id))
    }
  }, [])

  const fetchAssignation = useCallback(async () => {
    if (periodeId == null) return
    setLoadingData(true)
    const res = await fetch(`/api/kpi/employe/a-assigner?periodeId=${periodeId}`)
    setLoadingData(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? 'Chargement', variant: 'destructive' })
      setGrouped(null)
      return
    }
    const data = await res.json()
    setGrouped(data.grouped ?? null)
  }, [periodeId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPeriodes().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [fetchPeriodes])

  useEffect(() => {
    if (periodeId != null) fetchAssignation()
    else setGrouped(null)
  }, [periodeId, fetchAssignation])

  const selectedPeriode = periodes.find((p) => p.id === periodeId)
  const totalCollaborateurs =
    grouped
      ? grouped.rattachesDirects.length +
        grouped.directeurs.length +
        grouped.chefsService.length +
        grouped.managers.length +
        grouped.employes.length
      : 0

  return (
    <div className="space-y-6 p-6">
      {/* Sélecteur de période en haut */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignation des KPI</h1>
          <p className="text-muted-foreground mt-1">
            Gérer les KPI assignés aux membres de votre périmètre pour la période sélectionnée.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Période :</span>
          <Select
            value={periodeId != null ? String(periodeId) : 'none'}
            onValueChange={(v) => (v !== 'none' ? setPeriodeId(parseInt(v, 10)) : setPeriodeId(null))}
            disabled={loading || periodes.length === 0}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sélectionner une période" />
            </SelectTrigger>
            <SelectContent>
              {periodes.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.code} {p.statut === 'EN_COURS' ? '(en cours)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedPeriode && (
        <p className="text-sm text-muted-foreground">
          Période active : <strong>{selectedPeriode.code}</strong>
        </p>
      )}

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Collaborateurs assignables</CardTitle>
              <CardDescription>
                {totalCollaborateurs} personne{totalCollaborateurs !== 1 ? 's' : ''} dans votre périmètre — groupées par rôle
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : periodeId == null ? (
            <p className="text-muted-foreground">Sélectionnez une période.</p>
          ) : loadingData ? (
            <p className="text-muted-foreground">Chargement des assignations...</p>
          ) : grouped ? (
            <>
              <SectionTable
                title="Rattachés directs à la direction"
                icon={<Link2 className="h-4 w-4" />}
                rows={grouped.rattachesDirects}
                router={router}
              />
              <SectionTable
                title="Directeurs"
                icon={<span className="text-orange-500">◆</span>}
                rows={grouped.directeurs}
                router={router}
              />
              <SectionTable
                title="Chefs de service"
                icon={<span className="text-violet-500">◆</span>}
                rows={grouped.chefsService}
                router={router}
              />
              <SectionTable
                title="Managers"
                icon={<span className="text-blue-500">◆</span>}
                rows={grouped.managers}
                router={router}
              />
              <SectionTable
                title="Employés"
                icon={<span className="text-muted-foreground">◆</span>}
                rows={grouped.employes}
                router={router}
              />
              {totalCollaborateurs === 0 && (
                <p className="text-muted-foreground py-4">Aucun collaborateur dans votre périmètre.</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground py-4">Aucune donnée.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => router.push('/manager/assignation/contestations')}>
          Voir les contestations
        </Button>
      </div>
    </div>
  )
}
