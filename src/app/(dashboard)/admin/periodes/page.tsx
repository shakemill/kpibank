'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { TableSkeleton } from '@/components/table-skeleton'
import { Calendar, Plus, Play, Lock, ListChecks, ArrowLeft, CalendarClock, Filter, X } from 'lucide-react'

type PeriodeRow = {
  id: number
  code: string
  type: string
  statut: string
  date_debut: string
  date_fin: string
  date_limite_saisie: string
  actif: boolean
  mois_debut: number
  mois_fin: number
  annee: number
}

const STATUT_CONFIG: Record<string, { label: string; className: string }> = {
  A_VENIR: { label: 'À venir', className: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200' },
  EN_COURS: { label: 'En cours', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200' },
  CLOTUREE: { label: 'Clôturée', className: 'bg-muted text-muted-foreground border-border' },
}

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return s
  }
}

function formatType(type: string) {
  return type === 'TRIMESTRIEL' ? 'Trimestriel' : type === 'SEMESTRIEL' ? 'Semestriel' : type
}

export default function AdminPeriodesPage() {
  const [periodes, setPeriodes] = useState<PeriodeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [cloturerId, setCloturerId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [newType, setNewType] = useState<'TRIMESTRIEL' | 'SEMESTRIEL'>('SEMESTRIEL')
  const [newAnnee, setNewAnnee] = useState(new Date().getFullYear())
  const [newTrimestre, setNewTrimestre] = useState(1)
  const [newSemestre, setNewSemestre] = useState(1)
  const [newJourLimite, setNewJourLimite] = useState('')

  const [filterAnnee, setFilterAnnee] = useState<string>('')
  const [filterDateDebut, setFilterDateDebut] = useState<string>('')
  const [filterDateFin, setFilterDateFin] = useState<string>('')
  const [filterStatut, setFilterStatut] = useState<string>('')

  const filteredPeriodes = useMemo(() => {
    return periodes.filter((p) => {
      if (filterAnnee && p.annee.toString() !== filterAnnee) return false
      if (filterStatut && p.statut !== filterStatut) return false
      if (filterDateDebut) {
        const d = new Date(p.date_debut)
        const fd = new Date(filterDateDebut)
        if (d < fd) return false
      }
      if (filterDateFin) {
        const d = new Date(p.date_fin)
        const ff = new Date(filterDateFin)
        if (d > ff) return false
      }
      return true
    })
  }, [periodes, filterAnnee, filterStatut, filterDateDebut, filterDateFin])

  const anneesUniques = useMemo(() => {
    const years = [...new Set(periodes.map((p) => p.annee))].sort((a, b) => b - a)
    return years
  }, [periodes])

  const hasActiveFilters = !!filterAnnee || !!filterStatut || !!filterDateDebut || !!filterDateFin

  const clearFilters = () => {
    setFilterAnnee('')
    setFilterStatut('')
    setFilterDateDebut('')
    setFilterDateFin('')
  }

  const fetchPeriodes = useCallback(async () => {
    const res = await fetch('/api/periodes')
    if (!res.ok) {
      toast({ title: 'Erreur', description: 'Impossible de charger les périodes', variant: 'destructive' })
      return
    }
    const data = await res.json()
    setPeriodes(data)
  }, [])

  useEffect(() => {
    fetchPeriodes().finally(() => setLoading(false))
  }, [fetchPeriodes])

  const handleActiver = async (id: number) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/periodes/${id}/activer`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec activation', variant: 'destructive' })
        return
      }
      toast({ title: 'Période activée' })
      fetchPeriodes()
    } finally {
      setSaving(false)
    }
  }

  const handleCloturer = async (id: number) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/periodes/${id}/cloturer`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec clôture', variant: 'destructive' })
        return
      }
      toast({ title: 'Période clôturée' })
      setCloturerId(null)
      fetchPeriodes()
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        type: newType,
        annee: newAnnee,
      }
      if (newType === 'TRIMESTRIEL') body.trimestre = newTrimestre
      else body.semestre = newSemestre
      if (newJourLimite) body.jourLimite = parseInt(newJourLimite, 10)
      const res = await fetch('/api/periodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec création', variant: 'destructive' })
        return
      }
      toast({ title: 'Période créée' })
      setModalOpen(false)
      setNewJourLimite('')
      fetchPeriodes()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3">
          <Button variant="ghost" size="sm" className="w-fit gap-2 -ml-2" asChild>
            <Link href="/dashboard/admin" title="Retour à la configuration">
              <ArrowLeft className="h-4 w-4" />
              Retour à la configuration
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm shrink-0">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Périodes d&apos;évaluation</h1>
              <p className="text-muted-foreground mt-0.5">
                Gérer les périodes trimestrielles et semestrielles pour les évaluations KPI.
              </p>
            </div>
          </div>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle période
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle période</DialogTitle>
              <DialogDescription>Créer une période d&apos;évaluation. La période sera créée avec le statut « À venir ».</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as 'TRIMESTRIEL' | 'SEMESTRIEL')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRIMESTRIEL">Trimestriel</SelectItem>
                    <SelectItem value="SEMESTRIEL">Semestriel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Année</Label>
                <Input
                  type="number"
                  min={2020}
                  max={2030}
                  value={newAnnee}
                  onChange={(e) => setNewAnnee(parseInt(e.target.value, 10) || new Date().getFullYear())}
                />
              </div>
              {newType === 'TRIMESTRIEL' && (
                <div className="grid gap-2">
                  <Label>Trimestre</Label>
                  <Select value={String(newTrimestre)} onValueChange={(v) => setNewTrimestre(parseInt(v, 10))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">T1 (janv.-mars)</SelectItem>
                      <SelectItem value="2">T2 (avr.-juin)</SelectItem>
                      <SelectItem value="3">T3 (juil.-sept.)</SelectItem>
                      <SelectItem value="4">T4 (oct.-déc.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {newType === 'SEMESTRIEL' && (
                <div className="grid gap-2">
                  <Label>Semestre</Label>
                  <Select value={String(newSemestre)} onValueChange={(v) => setNewSemestre(parseInt(v, 10))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">S1 (janv.-juin)</SelectItem>
                      <SelectItem value="2">S2 (juil.-déc.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label>Jour limite de saisie (optionnel)</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="Ex. 10 (défaut : paramètre système)"
                  value={newJourLimite}
                  onChange={(e) => setNewJourLimite(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Jour du mois suivant pour la date limite. Laisser vide pour utiliser le paramètre DELAI_SAISIE_JOUR.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? 'Création…' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Liste des périodes</CardTitle>
              <CardDescription>
                {filteredPeriodes.length} période{filteredPeriodes.length !== 1 ? 's' : ''} affichée{filteredPeriodes.length !== 1 ? 's' : ''}
                {hasActiveFilters && ` (${periodes.length} au total)`}
              </CardDescription>
            </div>
          </div>
          {!loading && periodes.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/50 mt-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                Filtres
              </div>
              <Select value={filterAnnee || 'all'} onValueChange={(v) => setFilterAnnee(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder="Année" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les années</SelectItem>
                  {anneesUniques.map((a) => (
                    <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatut || 'all'} onValueChange={(v) => setFilterStatut(v === 'all' ? '' : v)}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="A_VENIR">À venir</SelectItem>
                  <SelectItem value="EN_COURS">En cours</SelectItem>
                  <SelectItem value="CLOTUREE">Clôturée</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                placeholder="Date début"
                value={filterDateDebut}
                onChange={(e) => setFilterDateDebut(e.target.value)}
                className="w-[150px] h-9"
              />
              <Input
                type="date"
                placeholder="Date fin"
                value={filterDateFin}
                onChange={(e) => setFilterDateFin(e.target.value)}
                className="w-[150px] h-9"
              />
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="gap-1.5 h-9" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                  Réinitialiser
                </Button>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={6} cols={7} />
            </div>
          ) : periodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <CalendarClock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Aucune période</h3>
              <p className="text-muted-foreground text-sm max-w-sm mb-6">
                Créez votre première période d&apos;évaluation pour démarrer la saisie des KPI.
              </p>
              <Button className="gap-2" onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4" />
                Nouvelle période
              </Button>
            </div>
          ) : filteredPeriodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <CalendarClock className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-base font-semibold mb-1">Aucun résultat</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Aucune période ne correspond aux filtres appliqués.
              </p>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Début</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Limite saisie</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPeriodes.map((p) => {
                    const statutConfig = STATUT_CONFIG[p.statut] ?? { label: p.statut, className: '' }
                    return (
                      <TableRow key={p.id} className="group">
                        <TableCell className="font-medium">{p.code}</TableCell>
                        <TableCell className="text-muted-foreground">{formatType(p.type)}</TableCell>
                        <TableCell>{formatDate(p.date_debut)}</TableCell>
                        <TableCell>{formatDate(p.date_fin)}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(p.date_limite_saisie)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statutConfig.className}>
                            {statutConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-2">
                            {p.statut !== 'EN_COURS' && p.statut !== 'CLOTUREE' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => handleActiver(p.id)}
                                disabled={saving}
                              >
                                <Play className="h-3.5 w-3.5" />
                                Ouvrir
                              </Button>
                            )}
                            {p.statut !== 'CLOTUREE' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setCloturerId(p.id)}
                                disabled={saving}
                              >
                                <Lock className="h-3.5 w-3.5" />
                                Clôturer
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="gap-1.5" asChild>
                              <Link href={`/directeur/kpi-direction?periodeId=${p.id}`}>
                                <ListChecks className="h-3.5 w-3.5" />
                                KPI
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={cloturerId != null} onOpenChange={(open) => !open && setCloturerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clôturer la période</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La période passera au statut « Clôturée ». Confirmer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cloturerId != null && handleCloturer(cloturerId)}
              className="bg-destructive text-destructive-foreground"
            >
              Clôturer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
