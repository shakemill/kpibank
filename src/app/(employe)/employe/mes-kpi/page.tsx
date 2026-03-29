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
import { Target, Calendar, Check, AlertCircle, FileInput } from 'lucide-react'

type Periode = { id: number; code: string; statut: string }
type KpiRow = {
  id: number
  cible: number
  poids: number
  statut: string
  motif_contestation: string | null
  reponse_contestation: string | null
  catalogueKpi: { nom: string; unite: string | null }
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

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mes KPI</h1>
        <p className="text-muted-foreground mt-1">
          Consulter et accepter ou contester les KPI assignés pour la période.
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Période</CardTitle>
              <CardDescription>Choisir la période</CardDescription>
            </div>
          </div>
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
                  <SelectItem key={p.id} value={String(p.id)}>{p.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">KPI de la période</CardTitle>
              <CardDescription>Statut et actions (accepter / contester)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {periodeId == null ? (
            <p className="text-muted-foreground">Sélectionnez une période.</p>
          ) : loadingKpi ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KPI</TableHead>
                  <TableHead>Cible</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead>Poids</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[220px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.catalogueKpi.nom}</TableCell>
                    <TableCell>{row.cible}</TableCell>
                    <TableCell>{row.catalogueKpi.unite ?? '—'}</TableCell>
                    <TableCell>{row.poids}%</TableCell>
                    <TableCell>
                      <Badge className={STATUT_MAP[row.statut]?.className ?? 'bg-muted'}>
                        {STATUT_MAP[row.statut]?.label ?? row.statut}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.statut === 'NOTIFIE' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleAccepter(row)}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Accepter
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
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
                        <Button variant="outline" size="sm" asChild className="gap-1">
                          <Link href={`/saisie?kpiEmployeId=${row.id}`}>
                            <FileInput className="h-3.5 w-3.5" />
                            Saisir
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!loadingKpi && periodeId != null && list.length === 0 && (
            <p className="text-muted-foreground py-4">Aucun KPI pour cette période.</p>
          )}
        </CardContent>
      </Card>

      {list.some((k) => k.statut === 'CONTESTE') && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Contestations en attente de réponse
            </CardTitle>
            <CardDescription>
              Les KPI suivants ont été contestés. La réponse du manager s&apos;affiche lorsqu&apos;elle est disponible.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {list
              .filter((k) => k.statut === 'CONTESTE' || k.reponse_contestation)
              .map((row) => (
                <div key={row.id} className="rounded-lg border p-4 space-y-2">
                  <p className="font-medium">{row.catalogueKpi.nom}</p>
                  {row.motif_contestation && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Votre motif :</span> {row.motif_contestation}
                    </p>
                  )}
                  {row.reponse_contestation && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Réponse du manager :</span> {row.reponse_contestation}
                    </p>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!contesterModal} onOpenChange={(o) => !o && (setContesterModal(null), setMotif(''))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contester ce KPI</DialogTitle>
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
                <p className="text-xs text-muted-foreground mt-1">
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
