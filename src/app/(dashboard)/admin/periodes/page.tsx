'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
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
import { Calendar, Plus, Play, Lock, ListChecks } from 'lucide-react'
import Link from 'next/link'

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

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return s
  }
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Périodes d&apos;évaluation</h1>
          <p className="text-muted-foreground">Gérer les périodes trimestrielles et semestrielles.</p>
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
              <DialogDescription>Créer une période d&apos;évaluation. Statut initial : A_VENIR.</DialogDescription>
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
                <Label>Jour limite de saisie (mois suivant) — optionnel, défaut : paramètre DELAI_SAISIE_JOUR</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="ex. 10"
                  value={newJourLimite}
                  onChange={(e) => setNewJourLimite(e.target.value)}
                />
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

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Début</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Date limite saisie</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.code}</TableCell>
                  <TableCell>{p.type}</TableCell>
                  <TableCell>{formatDate(p.date_debut)}</TableCell>
                  <TableCell>{formatDate(p.date_fin)}</TableCell>
                  <TableCell>{formatDate(p.date_limite_saisie)}</TableCell>
                  <TableCell>
                    <span className={
                      p.statut === 'EN_COURS' ? 'text-green-600 font-medium' :
                      p.statut === 'CLOTUREE' ? 'text-muted-foreground' : ''
                    }>
                      {p.statut}
                    </span>
                  </TableCell>
                  <TableCell className="text-right flex flex-wrap justify-end gap-2">
                    {p.statut !== 'EN_COURS' && p.statut !== 'CLOTUREE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleActiver(p.id)}
                        disabled={saving}
                      >
                        <Play className="h-3 w-3" />
                        Passer en EN_COURS
                      </Button>
                    )}
                    {p.statut !== 'CLOTUREE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-destructive"
                        onClick={() => setCloturerId(p.id)}
                        disabled={saving}
                      >
                        <Lock className="h-3 w-3" />
                        Clôturer
                      </Button>
                    )}
                    <Link href={`/directeur/kpi-direction?periodeId=${p.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <ListChecks className="h-3 w-3" />
                        KPI rattachés
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={cloturerId != null} onOpenChange={(open) => !open && setCloturerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clôturer la période</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La période passera au statut CLOTUREE. Confirmer ?
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
