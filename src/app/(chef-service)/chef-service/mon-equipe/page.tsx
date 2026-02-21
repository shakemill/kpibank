'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertTriangle, Target, Plus, CheckCircle, ClipboardList, Eye } from 'lucide-react'
import { KpiDrawer } from '@/components/assignation/KpiDrawer'
import { ValidationRapideModal } from '@/components/validation/ValidationRapideModal'

type ManagerRow = {
  id: number
  nom: string
  prenom: string
  email: string
  nbCollaborateurs: number
  scoreMoyenEquipe: number
  saisiesEnAttenteValidation: number
  contestationsOuvertes: number
}
type EmployeRow = {
  id: number
  nom: string
  prenom: string
  email: string
  role: string
  managerNom: string | null
  scoreGlobal: number
  statutSaisieMois: string
  kpiAcceptes: number
  kpiTotalAssignes: number
  sommePoids: number
}
type ApiResponse = {
  serviceId: number
  serviceNom: string
  directionNom: string
  periodeId: number
  periodeCode: string
  managers: ManagerRow[]
  employes: EmployeRow[]
  alertes: {
    employesSansKpi: { id: number; nom: string; prenom: string }[]
    saisiesManquantes: { id: number; nom: string; prenom: string; statut: string }[]
  }
}

type EquipeRow = {
  id: number
  nom: string
  prenom: string
  email: string
  role: string
  managerNom: string | null
  kpiTotalAssignes: number
  sommePoids: number
  statutSaisieMois: string
  isManager: boolean
}

const STATUT_SAISIE_MAP: Record<string, { label: string; className: string }> = {
  VALIDEE: { label: 'Validée', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  SOUMISE: { label: 'Soumise', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  OUVERTE: { label: 'En cours', className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
  MANQUANTE: { label: 'Manquante', className: 'bg-red-500/10 text-red-700 dark:text-red-400' },
  EN_RETARD: { label: 'Manquante', className: 'bg-red-500/10 text-red-700 dark:text-red-400' },
  NON_OUVERTE: { label: 'Non ouverte', className: 'bg-muted text-muted-foreground' },
}

const ROLE_MAP: Record<string, string> = {
  CHEF_SERVICE: 'Chef de service',
  MANAGER: 'Manager',
  EMPLOYE: 'Employé',
}

function kpiAssignesLabel(kpiTotalAssignes: number, sommePoids: number): { text: string; ok: boolean } {
  if (kpiTotalAssignes === 0) return { text: 'Aucun KPI 🔴', ok: false }
  const pct = Math.round(sommePoids)
  if (Math.abs(sommePoids - 100) < 0.5) return { text: `${kpiTotalAssignes} KPI — ${pct}% ✅`, ok: true }
  return { text: `${kpiTotalAssignes} KPI — ${pct}% ⚠️`, ok: false }
}

export default function MonEquipePage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [soumisesCount, setSoumisesCount] = useState(0)
  const [drawerUser, setDrawerUser] = useState<EquipeRow | null>(null)
  const [validationUser, setValidationUser] = useState<{ id: number; name: string } | null>(null)

  const fetchEquipe = useCallback(async () => {
    const url = periodeId != null ? `/api/chef-service/equipe?periodeId=${periodeId}` : '/api/chef-service/equipe'
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

  const fetchSoumisesCount = useCallback(async () => {
    const now = new Date()
    const res = await fetch(`/api/saisies/soumises?mois=${now.getMonth() + 1}&annee=${now.getFullYear()}`)
    if (!res.ok) return
    const json = await res.json()
    setSoumisesCount(Array.isArray(json.list) ? json.list.length : json.list?.length ?? 0)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchEquipe().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [fetchEquipe])

  useEffect(() => {
    if (!data) return
    fetchSoumisesCount()
  }, [data, fetchSoumisesCount])

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

  const equipeRows: EquipeRow[] = [
    ...data.managers.map((m) => ({
      id: m.id,
      nom: m.nom,
      prenom: m.prenom,
      email: m.email,
      role: 'MANAGER',
      managerNom: null as string | null,
      kpiTotalAssignes: 0,
      sommePoids: 0,
      statutSaisieMois: '-',
      isManager: true,
    })),
    ...data.employes.map((e) => ({
      id: e.id,
      nom: e.nom,
      prenom: e.prenom,
      email: e.email,
      role: e.role,
      managerNom: e.managerNom,
      kpiTotalAssignes: e.kpiTotalAssignes,
      sommePoids: e.sommePoids,
      statutSaisieMois: e.statutSaisieMois,
      isManager: false,
    })),
  ]

  const now = new Date()
  const moisCourant = now.getMonth() + 1
  const anneeCourant = now.getFullYear()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mon équipe — {data.serviceNom}</h1>
          <p className="text-muted-foreground">
            Direction {data.directionNom || '—'} — Période {data.periodeCode}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/manager/assignation">
              <Plus className="h-4 w-4" />
              Assigner des KPI en masse
            </Link>
          </Button>
          <Button variant="secondary" className="gap-2" asChild={soumisesCount === 0}>
            {soumisesCount === 0 ? (
              <Link href="/manager/assignation" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Valider les saisies (0 en attente)
              </Link>
            ) : (
              <span className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Valider les saisies ({soumisesCount} en attente)
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Alertes */}
      {(data.alertes.employesSansKpi.length > 0 || data.alertes.saisiesManquantes.length > 0) && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Alertes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.alertes.employesSansKpi.length > 0 && (
              <p className="text-sm">
                <strong>Employés sans aucun KPI assigné :</strong>{' '}
                {data.alertes.employesSansKpi.map((e) => `${e.prenom} ${e.nom}`).join(', ')}
              </p>
            )}
            {data.alertes.saisiesManquantes.length > 0 && (
              <p className="text-sm">
                <strong>Saisies manquantes ou en retard :</strong>{' '}
                {data.alertes.saisiesManquantes.map((e) => `${e.prenom} ${e.nom}`).join(', ')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tableau unique équipe */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Équipe</CardTitle>
          <p className="text-muted-foreground text-sm">
            Collaborateurs, KPI assignés et statut de saisie du mois en cours.
          </p>
        </CardHeader>
        <CardContent>
          {equipeRows.length === 0 ? (
            <p className="text-muted-foreground py-4">Aucun collaborateur dans ce service.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collaborateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>KPI assignés</TableHead>
                  <TableHead>Poids</TableHead>
                  <TableHead>Statut saisie mois en cours</TableHead>
                  <TableHead className="w-[240px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipeRows.map((row) => {
                  const kpiLabel = kpiAssignesLabel(row.kpiTotalAssignes, row.sommePoids)
                  const statutInfo = STATUT_SAISIE_MAP[row.statutSaisieMois]
                  const showValider = !row.isManager && row.statutSaisieMois === 'SOUMISE'
                  const fullName = `${row.prenom} ${row.nom}`
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{fullName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ROLE_MAP[row.role] ?? row.role}</Badge>
                      </TableCell>
                      <TableCell>{row.isManager ? '—' : kpiLabel.text}</TableCell>
                      <TableCell>{row.isManager ? '—' : `${Math.round(row.sommePoids)}%`}</TableCell>
                      <TableCell>
                        {row.statutSaisieMois === '-' ? (
                          '—'
                        ) : (
                          <Badge className={statutInfo?.className ?? 'bg-muted'}>
                            {statutInfo?.label ?? row.statutSaisieMois}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => setDrawerUser(row)}
                          >
                            <ClipboardList className="h-4 w-4" />
                            Gérer KPI
                          </Button>
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
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button asChild>
          <Link href="/chef-service/kpi-service" className="gap-2">
            <Target className="h-4 w-4" />
            Voir les KPI du service
          </Link>
        </Button>
      </div>

      {/* Drawer Gérer KPI */}
      {data && drawerUser && (
        <KpiDrawer
          userId={drawerUser.id}
          userName={`${drawerUser.prenom} ${drawerUser.nom}`}
          userRole={ROLE_MAP[drawerUser.role] ?? drawerUser.role}
          serviceId={data.serviceId}
          managerNom={drawerUser.managerNom}
          periodeId={data.periodeId}
          periodeCode={data.periodeCode}
          serviceNom={data.serviceNom}
          isOpen={!!drawerUser}
          onClose={() => setDrawerUser(null)}
          onUpdate={() => {
            fetchEquipe()
            fetchSoumisesCount()
          }}
        />
      )}

      {/* Modal validation rapide */}
      {validationUser && (
        <ValidationRapideModal
          employeId={validationUser.id}
          employeName={validationUser.name}
          mois={moisCourant}
          annee={anneeCourant}
          isOpen={!!validationUser}
          onClose={() => setValidationUser(null)}
          onUpdate={() => {
            fetchEquipe()
            fetchSoumisesCount()
          }}
        />
      )}
    </div>
  )
}
