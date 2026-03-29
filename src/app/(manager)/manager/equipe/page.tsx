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
import { AlertTriangle, Target, Plus, CheckCircle, ClipboardList, Eye, Users } from 'lucide-react'
import { KpiDrawer } from '@/components/assignation/KpiDrawer'
import { ValidationRapideModal } from '@/components/validation/ValidationRapideModal'

type EmployeRow = {
  id: number
  nom: string
  prenom: string
  email: string
  serviceId: number | null
  serviceNom: string | null
  scoreGlobal: number
  statutSaisieMois: string
  kpiTotalAssignes: number
  sommePoids: number
}

type ApiResponse = {
  periodeId: number
  periodeCode: string
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
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [periodes, setPeriodes] = useState<{ id: number; code: string }[]>([])
  const [drawerUser, setDrawerUser] = useState<EmployeRow | null>(null)
  const [validationUser, setValidationUser] = useState<{ id: number; name: string } | null>(null)

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Mon équipe
          </h1>
          <p className="text-muted-foreground">
            Collaborateurs directs — Période {data.periodeCode}
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

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Collaborateurs</CardTitle>
          <p className="text-muted-foreground text-sm">
            KPI assignés et statut de saisie du mois en cours.
          </p>
        </CardHeader>
        <CardContent>
          {data.employes.length === 0 ? (
            <p className="text-muted-foreground py-4">Aucun collaborateur dans votre équipe.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collaborateur</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead>KPI assignés</TableHead>
                  <TableHead>Statut saisie</TableHead>
                  <TableHead className="w-[220px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.employes.map((row) => {
                  const kpiLabel = kpiAssignesLabel(row.kpiTotalAssignes, row.sommePoids)
                  const statutInfo = STATUT_SAISIE_MAP[row.statutSaisieMois]
                  const showValider = row.statutSaisieMois === 'SOUMISE'
                  const fullName = `${row.prenom} ${row.nom}`
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{fullName}</TableCell>
                      <TableCell className="text-muted-foreground">{row.serviceNom ?? '—'}</TableCell>
                      <TableCell className="text-right">{row.scoreGlobal.toFixed(1)} %</TableCell>
                      <TableCell>{kpiLabel.text}</TableCell>
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
          userRole="Employé"
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
