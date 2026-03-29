'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Building2, Users, Target, ExternalLink, BarChart3 } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts'

type DirectionOption = { id: number; nom: string; code?: string }
type Periode = { id: number; code: string; statut: string }
type ServiceRow = {
  id: number
  nom: string
  code: string
  responsable: { id: number; nom: string; prenom: string; email: string } | null
  nbEmployes: number
  kpiActifs: number
  tauxAtteinte: number
  nbSaisiesEnRetard: number
  actif: boolean
}
type ApiResponse = {
  directionId: number
  directionNom: string
  directionCode: string
  periodeId: number
  services: ServiceRow[]
}

export default function DirecteurServicesPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role ?? ''
  const isDG = role === 'DG'

  const [directions, setDirections] = useState<DirectionOption[]>([])
  const [selectedDirectionId, setSelectedDirectionId] = useState<string>('')
  const [periodes, setPeriodes] = useState<Periode[]>([])
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingServices, setLoadingServices] = useState(false)

  const fetchDirections = useCallback(async () => {
    const res = await fetch('/api/organisation/directions?actif=true')
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err?.error ?? 'Chargement directions')
      return
    }
    const list = await res.json()
    const opts = (list ?? []).map((d: { id: number; nom: string; code?: string }) => ({
      id: d.id,
      nom: d.nom,
      code: d.code,
    }))
    setDirections(opts)
    if (opts.length > 0) setSelectedDirectionId((prev) => prev || String(opts[0].id))
  }, [])

  const fetchPeriodes = useCallback(async () => {
    const res = await fetch('/api/periodes')
    if (!res.ok) return
    const list = await res.json()
    setPeriodes(list ?? [])
    if (list?.length > 0 && !periodeId) setPeriodeId(list[0].id)
  }, [periodeId])

  const fetchServices = useCallback(async () => {
    if (isDG && !selectedDirectionId) return
    if (periodeId == null) return
    setLoadingServices(true)
    const url = isDG
      ? `/api/directeur/services?directionId=${selectedDirectionId}&periodeId=${periodeId}`
      : `/api/directeur/services?periodeId=${periodeId}`
    const res = await fetch(url)
    setLoadingServices(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      toast.error(err?.error ?? 'Chargement services')
      setData(null)
      return
    }
    const json = await res.json()
    setData(json)
  }, [isDG, selectedDirectionId, periodeId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const promises: Promise<void>[] = [fetchPeriodes()]
    if (isDG) promises.push(fetchDirections())
    Promise.all(promises).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [fetchPeriodes, isDG, fetchDirections])

  useEffect(() => {
    if (periodeId != null && (!isDG || selectedDirectionId)) fetchServices()
    else setData(null)
  }, [periodeId, fetchServices, isDG, selectedDirectionId])

  const directionNom = data?.directionNom ?? (isDG && selectedDirectionId ? directions.find((d) => String(d.id) === selectedDirectionId)?.nom : null) ?? ''
  const services = data?.services ?? []
  const nbActifs = services.filter((s) => s.actif).length

  const chartData = services.map((s) => ({
    name: s.nom,
    taux: Math.round(s.tauxAtteinte * 10) / 10,
    fill:
      s.tauxAtteinte >= 90 ? '#22c55e' : s.tauxAtteinte >= 70 ? '#f97316' : '#ef4444',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Services de la direction{directionNom ? ` — ${directionNom}` : ''}</h1>
        <p className="text-muted-foreground">
          Consulter les services, taux d&apos;atteinte et équipes.
        </p>
      </div>

      {/* Sélecteur direction (DG) */}
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

      {/* Période */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Période</CardTitle>
          <CardDescription>Période pour les indicateurs et KPI</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : (
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
          )}
        </CardContent>
      </Card>

      {loadingServices && (
        <p className="text-muted-foreground">Chargement des services...</p>
      )}

      {!loadingServices && data && (
        <>
          {/* Header badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{nbActifs} service{nbActifs !== 1 ? 's' : ''} actif{nbActifs !== 1 ? 's' : ''}</Badge>
          </div>

          {/* Cards récap par service */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((svc) => (
              <Card key={svc.id} className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
                    <span className="flex items-center gap-2">
                      {svc.nom}
                      {svc.kpiActifs === 0 && (
                        <Badge variant="secondary" className="text-muted-foreground font-normal text-xs">
                          Pas encore de KPI
                        </Badge>
                      )}
                    </span>
                    {!svc.actif && (
                      <Badge variant="outline" className="text-muted-foreground">Inactif</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {svc.responsable
                      ? `${svc.responsable.prenom} ${svc.responsable.nom}`
                      : 'Aucun responsable'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Taux atteinte</span>
                    <span
                      className={
                        svc.tauxAtteinte >= 90
                          ? 'text-green-600 font-medium'
                          : svc.tauxAtteinte >= 70
                            ? 'text-orange-600'
                            : 'text-red-600'
                      }
                    >
                      {svc.tauxAtteinte.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Employés</span>
                    <span>{svc.nbEmployes}</span>
                  </div>
                  {svc.nbSaisiesEnRetard > 0 && (
                    <div className="flex items-center justify-between text-sm text-amber-600">
                      <span>Saisies en retard (mois)</span>
                      <span>{svc.nbSaisiesEnRetard}</span>
                    </div>
                  )}
                  <Button variant="outline" size="sm" className="w-full mt-2 gap-2" asChild>
                    <Link href={`/chef-service/kpi-service?serviceId=${svc.id}`}>
                      <Target className="h-4 w-4" />
                      Voir les KPI {svc.kpiActifs != null ? `(${svc.kpiActifs})` : ''}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* BarChart comparaison inter-services */}
          {chartData.length > 0 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Comparaison inter-services
                </CardTitle>
                <CardDescription>
                  Taux d&apos;atteinte par service (vert ≥90%, orange 70–90%, rouge &lt;70%)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 80, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 120]} unit="%" />
                    <YAxis type="category" dataKey="name" width={76} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Taux atteinte']} />
                    <Bar dataKey="taux" name="Taux %" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tableau des services */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Liste des services</CardTitle>
              <CardDescription>Détail et actions</CardDescription>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">
                  Aucun service dans cette direction.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead className="text-right">Employés</TableHead>
                      <TableHead className="text-right">KPI actifs</TableHead>
                      <TableHead className="text-right">Taux atteinte</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-[180px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((svc) => (
                      <TableRow key={svc.id}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            {svc.nom}
                            {svc.kpiActifs === 0 && (
                              <Badge variant="secondary" className="text-muted-foreground font-normal text-xs">
                                Pas encore de KPI
                              </Badge>
                            )}
                          </span>
                        </TableCell>
                        <TableCell>{svc.code}</TableCell>
                        <TableCell>
                          {svc.responsable
                            ? `${svc.responsable.prenom} ${svc.responsable.nom}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right">{svc.nbEmployes}</TableCell>
                        <TableCell className="text-right">{svc.kpiActifs}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              svc.tauxAtteinte >= 90
                                ? 'text-green-600'
                                : svc.tauxAtteinte >= 70
                                  ? 'text-orange-600'
                                  : 'text-red-600'
                            }
                          >
                            {svc.tauxAtteinte.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={svc.actif ? 'default' : 'secondary'}>
                            {svc.actif ? 'Actif' : 'Inactif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/chef-service/kpi-service?serviceId=${svc.id}`} className="gap-1">
                                <Target className="h-4 w-4" />
                                KPI {svc.kpiActifs != null ? `(${svc.kpiActifs})` : ''}
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/chef-service/mon-equipe?serviceId=${svc.id}`} className="gap-1">
                                <Users className="h-4 w-4" />
                                Équipe
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!loading && !loadingServices && periodeId != null && (!isDG || selectedDirectionId) && !data && (
        <p className="text-muted-foreground">Aucune donnée pour cette période.</p>
      )}
    </div>
  )
}
