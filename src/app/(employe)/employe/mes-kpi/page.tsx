'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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
import {
  EmployePerformanceSection,
  type KpiPerformanceRow,
  type PerformancePeriode,
} from '@/components/dashboard/employe-performance-section'
import { cn } from '@/lib/utils'
import {
  Target,
  Calendar,
  Check,
  AlertCircle,
  FileInput,
  Loader2,
  ClipboardList,
  MessageSquare,
} from 'lucide-react'

type Periode = { id: number; code: string; statut: string }
type KpiRow = KpiPerformanceRow & {
  poids: number
  statut: string
  motif_contestation: string | null
  reponse_contestation: string | null
  realise_mois_courant?: number | null
  statut_saisie_mois?: string | null
  kpiService?: { id: number } | null
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

export default function MesKpiPage() {
  const [periodes, setPeriodes] = useState<Periode[]>([])
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [list, setList] = useState<KpiRow[]>([])
  const [performance, setPerformance] = useState<PerformancePeriode | null>(null)
  const [realisationsMois, setRealisationsMois] = useState<{ label: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingKpi, setLoadingKpi] = useState(false)
  const [contesterModal, setContesterModal] = useState<KpiRow | null>(null)
  const [motif, setMotif] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchPeriodes = useCallback(async () => {
    const res = await fetch('/api/periodes')
    if (!res.ok) return
    const data = await res.json()
    setPeriodes(data)
    const enCours = data.find((p: Periode) => p.statut === 'EN_COURS')
    if (data.length > 0 && !periodeId) setPeriodeId(enCours ? enCours.id : data[0].id)
  }, [periodeId])

  const fetchKpi = useCallback(async () => {
    if (periodeId == null) return
    setLoadingKpi(true)
    const res = await fetch(`/api/kpi/employe?periodeId=${periodeId}`)
    setLoadingKpi(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? 'Chargement', variant: 'destructive' })
      return
    }
    const data = await res.json()
    setList(data.list ?? [])
    setPerformance(data.performance ?? null)
    setRealisationsMois(data.realisationsMois ?? null)
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
    if (periodeId != null) fetchKpi()
  }, [periodeId, fetchKpi])

  const handleAccepter = async (row: KpiRow) => {
    const res = await fetch(`/api/kpi/employe/${row.id}/accepter`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Acceptation', variant: 'destructive' })
      return
    }
    toast({ title: 'KPI accepté' })
    fetchKpi()
  }

  const openContester = (row: KpiRow) => {
    setContesterModal(row)
    setMotif('')
  }

  const handleContester = async () => {
    if (!contesterModal) return
    if (motif.trim().length < 50) {
      toast({ title: 'Le motif doit contenir au moins 50 caractères', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    const res = await fetch(`/api/kpi/employe/${contesterModal.id}/contester`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motif: motif.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    setSubmitting(false)
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Contestation', variant: 'destructive' })
      return
    }
    toast({ title: 'Contestation envoyée' })
    setContesterModal(null)
    setMotif('')
    fetchKpi()
  }

  const periodeCode = periodes.find((p) => p.id === periodeId)?.code ?? ''
  const gestionParPoids = list.some((k) => (k.poids ?? 0) > 0)
  const notifieCount = list.filter((k) => k.statut === 'NOTIFIE').length
  const valideCount = list.filter((k) => k.statut === 'VALIDE').length
  const contesteCount = list.filter((k) => k.statut === 'CONTESTE').length
  const showPerformance = performance != null && list.length > 0

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-sm">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mes KPI</h1>
            <p className="text-muted-foreground text-sm">
              Consulter, accepter et suivre vos objectifs
              {periodeCode && (
                <Badge variant="outline" className="ml-2 font-normal">
                  {periodeCode}
                </Badge>
              )}
            </p>
          </div>
        </div>
        {!loading && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select
              value={periodeId != null ? String(periodeId) : 'none'}
              onValueChange={(v) => (v !== 'none' ? setPeriodeId(parseInt(v, 10)) : setPeriodeId(null))}
            >
              <SelectTrigger className="w-[200px] border-0 bg-transparent shadow-none focus:ring-0">
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
        )}
      </div>

      {!loadingKpi && list.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-border/60">
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">KPI assignés</p>
                <p className="text-2xl font-bold tabular-nums">{list.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Validés / actifs</p>
                <p className="text-2xl font-bold tabular-nums">{valideCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className={cn('border-border/60', notifieCount > 0 && 'border-blue-300 dark:border-blue-800')}>
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <div className={cn(
                'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                notifieCount > 0 ? 'bg-blue-500/15' : 'bg-muted'
              )}>
                <ClipboardList className={cn(
                  'h-5 w-5',
                  notifieCount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                )} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">À traiter</p>
                <p className="text-2xl font-bold tabular-nums">{notifieCount + contesteCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">KPI de la période</CardTitle>
                <CardDescription>Statut, réalisations et actions (accepter / contester / saisir)</CardDescription>
              </div>
            </div>
            {valideCount > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <Link href="/saisie">
                  <FileInput className="h-3.5 w-3.5" />
                  Aller à la saisie
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {periodeId == null ? (
            <p className="text-muted-foreground py-6 text-center">Sélectionnez une période.</p>
          ) : loadingKpi ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Chargement…</span>
            </div>
          ) : list.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center">Aucun KPI pour cette période.</p>
          ) : (
            <>
              {realisationsMois && (
                <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Mois de référence : <strong>{realisationsMois.label}</strong>
                </p>
              )}
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="min-w-[180px]">KPI</TableHead>
                      <TableHead className="text-right">Cible</TableHead>
                      <TableHead>Unité</TableHead>
                      {gestionParPoids && <TableHead className="text-right">Poids</TableHead>}
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Réalisé (période)</TableHead>
                      <TableHead className="text-right">Mois courant</TableHead>
                      <TableHead className="text-right">Taux</TableHead>
                      <TableHead className="min-w-[200px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((row, idx) => {
                      const unite = row.catalogueKpi.unite
                      const fmt = (v: number | null | undefined) =>
                        v != null ? `${Number(v).toFixed(1)}${unite ? ` ${unite}` : ''}` : '—'
                      const statutSaisie = row.statut_saisie_mois
                        ? STATUT_SAISIE_MAP[row.statut_saisie_mois]
                        : null
                      const stripe = idx % 2 === 1
                      return (
                        <TableRow
                          key={row.id}
                          className={cn(
                            stripe ? 'bg-muted/40 hover:bg-muted/55' : 'hover:bg-muted/25'
                          )}
                        >
                          <TableCell className="font-medium max-w-xs whitespace-normal break-words leading-snug">
                            {row.catalogueKpi.nom}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{row.cible}</TableCell>
                          <TableCell className="text-muted-foreground">{unite ?? '—'}</TableCell>
                          {gestionParPoids && (
                            <TableCell className="text-right tabular-nums">{row.poids}%</TableCell>
                          )}
                          <TableCell>
                            <Badge className={STATUT_MAP[row.statut]?.className ?? 'bg-muted'}>
                              {STATUT_MAP[row.statut]?.label ?? row.statut}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(row.realise_cumule)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="tabular-nums">{fmt(row.realise_mois_courant)}</span>
                              {statutSaisie && (
                                <Badge className={`${statutSaisie.className} text-[10px] px-1 py-0 w-fit`}>
                                  {statutSaisie.label}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {row.taux_atteinte != null ? (
                              <NotationBadge taux={row.taux_atteinte} showTaux variant="text" />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {row.statut === 'NOTIFIE' && (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900 dark:text-green-400"
                                  onClick={() => handleAccepter(row)}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Accepter
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-400"
                                  onClick={() => openContester(row)}
                                >
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  Contester
                                </Button>
                              </div>
                            )}
                            {(row.statut === 'MAINTENU' || row.statut === 'REVISE') && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => handleAccepter(row)}
                              >
                                <Check className="h-3.5 w-3.5" />
                                Valider
                              </Button>
                            )}
                            {row.statut === 'VALIDE' && (
                              <Button variant="default" size="sm" asChild className="gap-1">
                                <Link href={`/saisie?kpiEmployeId=${row.id}`}>
                                  <FileInput className="h-3.5 w-3.5" />
                                  Saisir
                                </Link>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {showPerformance && (
        <EmployePerformanceSection
          kpiList={list}
          performance={performance}
          periodeCode={periodeCode}
          gestionParPoids={gestionParPoids}
          gradientId="scoreMoisGradientMesKpi"
        />
      )}

      {list.some((k) => k.statut === 'CONTESTE' || k.reponse_contestation) && (
        <Card className="border-amber-200 dark:border-amber-800 overflow-hidden">
          <CardHeader className="bg-amber-500/5 border-b border-amber-500/10">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Contestations
            </CardTitle>
            <CardDescription>
              Suivi de vos contestations et des réponses de votre manager
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {list
              .filter((k) => k.statut === 'CONTESTE' || k.reponse_contestation)
              .map((row, idx) => (
                <div
                  key={row.id}
                  className={cn(
                    'rounded-lg border p-4 space-y-2',
                    idx % 2 === 1 ? 'bg-muted/30' : 'bg-background'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="font-medium">{row.catalogueKpi.nom}</p>
                    <Badge className={STATUT_MAP[row.statut]?.className ?? 'bg-muted'}>
                      {STATUT_MAP[row.statut]?.label ?? row.statut}
                    </Badge>
                  </div>
                  {row.motif_contestation && (
                    <div className="rounded-md bg-muted/50 p-3 text-sm">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Votre motif</p>
                      <p className="leading-relaxed">{row.motif_contestation}</p>
                    </div>
                  )}
                  {row.reponse_contestation && (
                    <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
                      <p className="text-xs font-medium text-primary mb-1">Réponse du manager</p>
                      <p className="leading-relaxed">{row.reponse_contestation}</p>
                    </div>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!contesterModal} onOpenChange={(o) => !o && (setContesterModal(null), setMotif(''))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Contester ce KPI
            </DialogTitle>
            {contesterModal && (
              <p className="text-sm text-muted-foreground">{contesterModal.catalogueKpi.nom}</p>
            )}
          </DialogHeader>
          {contesterModal && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Motif (min. 50 caractères)</label>
                <Textarea
                  className="min-h-[120px]"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder="Expliquez les raisons de votre contestation..."
                />
                <p className={cn(
                  'text-xs mt-1',
                  motif.length >= 50 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                )}>
                  {motif.length} / 50 caractères
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => (setContesterModal(null), setMotif(''))}>
                  Annuler
                </Button>
                <Button
                  onClick={handleContester}
                  disabled={motif.trim().length < 50 || submitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {submitting ? 'Envoi...' : 'Envoyer la contestation'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
