'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { NotationBadge } from '@/components/notation/NotationBadge'
import { formaterNomKpiAffichage } from '@/lib/kpi-cible-utils'
import { cn } from '@/lib/utils'
import { Check, ChevronLeft, ChevronRight, FileText, MessageSquare, Paperclip, Pencil, X } from 'lucide-react'

const MOIS_LABELS: Record<number, string> = {
  1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril', 5: 'Mai', 6: 'Juin',
  7: 'Juillet', 8: 'Août', 9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre',
}

function nomFichierPreuve(url: string): string {
  try {
    const last = decodeURIComponent(url.split('/').pop() ?? '')
    const m = last.match(/^\d+-[a-f0-9]+-(.+)$/i)
    return (m?.[1] ?? last) || 'Fichier'
  } catch {
    return 'Fichier'
  }
}

function isPreuveFichier(value: string): boolean {
  return value.startsWith('/uploads/') || /^https?:\/\//i.test(value)
}

export type SaisieValidation = {
  id: number
  employeId: number
  mois: number
  annee: number
  valeur_realisee: number | null
  valeur_ajustee: number | null
  valeur_affichée: number
  taux: number
  soumis_le: string | null
  commentaire: string | null
  preuves: string | null
  employe: { id: number; nom: string; prenom: string; email: string }
  kpiEmploye: {
    id: number
    cible: number
    catalogueKpi: { id: number; nom: string; type: string; unite: string | null }
  }
}

type ValidationKpiParKpiModalProps = {
  employeId: number
  employeName: string
  mois: number
  annee: number
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function ValidationKpiParKpiModal({
  employeId,
  employeName,
  mois,
  annee,
  isOpen,
  onClose,
  onUpdate,
}: ValidationKpiParKpiModalProps) {
  const [list, setList] = useState<SaisieValidation[]>([])
  const [initialCount, setInitialCount] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<'view' | 'ajuster' | 'rejeter'>('view')
  const [motifRejet, setMotifRejet] = useState('')
  const [valeurAjustee, setValeurAjustee] = useState('')
  const [motifAjustement, setMotifAjustement] = useState('')
  const [confirmValider, setConfirmValider] = useState(false)

  const fetchSoumises = useCallback(async () => {
    if (!isOpen || !employeId) return
    setLoading(true)
    const res = await fetch(
      `/api/saisies/soumises?employeId=${employeId}&mois=${mois}&annee=${annee}`
    )
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? 'Chargement', variant: 'destructive' })
      setList([])
      return
    }
    const data = await res.json()
    const items: SaisieValidation[] = data.list ?? []
    setList(items)
    setInitialCount((prev) => (prev === 0 && items.length > 0 ? items.length : prev || items.length))
    setCurrentIndex(0)
    setMode('view')
  }, [isOpen, employeId, mois, annee])

  useEffect(() => {
    if (isOpen) {
      setInitialCount(0)
      setMotifRejet('')
      setValeurAjustee('')
      setMotifAjustement('')
      fetchSoumises()
    }
  }, [isOpen, fetchSoumises])

  const current = list[currentIndex] ?? null
  const traitees = initialCount > 0 ? initialCount - list.length : 0
  const progressPct = initialCount > 0 ? Math.round((traitees / initialCount) * 100) : 0

  const afterAction = (remaining: SaisieValidation[]) => {
    setList(remaining)
    if (remaining.length === 0) {
      toast({ title: 'Validation terminée', description: 'Toutes les saisies ont été traitées.' })
      onUpdate()
      onClose()
      return
    }
    setCurrentIndex((i) => Math.min(i, remaining.length - 1))
    setMode('view')
    setMotifRejet('')
    setValeurAjustee('')
    setMotifAjustement('')
    onUpdate()
  }

  const handleValider = async () => {
    if (!current) return
    setSubmitting(true)
    const res = await fetch(`/api/saisies/${current.id}/valider`, { method: 'POST' })
    setSubmitting(false)
    setConfirmValider(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Validation', variant: 'destructive' })
      return
    }
    toast({ title: 'KPI validé' })
    afterAction(list.filter((s) => s.id !== current.id))
  }

  const handleRejeter = async () => {
    if (!current || !motifRejet.trim()) {
      toast({ title: 'Le motif est obligatoire', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    const res = await fetch(`/api/saisies/${current.id}/rejeter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motif: motifRejet.trim() }),
    })
    setSubmitting(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Rejet', variant: 'destructive' })
      return
    }
    toast({ title: 'Saisie rejetée' })
    afterAction(list.filter((s) => s.id !== current.id))
  }

  const handleAjuster = async () => {
    if (!current) return
    const val = parseFloat(valeurAjustee.replace(',', '.'))
    if (Number.isNaN(val)) {
      toast({ title: 'Valeur invalide', variant: 'destructive' })
      return
    }
    if (!motifAjustement.trim()) {
      toast({ title: "Le motif d'ajustement est obligatoire", variant: 'destructive' })
      return
    }
    setSubmitting(true)
    const res = await fetch(`/api/saisies/${current.id}/ajuster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valeur_ajustee: val, motif_ajustement: motifAjustement.trim() }),
    })
    setSubmitting(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Ajustement', variant: 'destructive' })
      return
    }
    toast({ title: 'Saisie ajustée et validée' })
    afterAction(list.filter((s) => s.id !== current.id))
  }

  const openAjuster = () => {
    if (!current) return
    setValeurAjustee(String(current.valeur_affichée ?? ''))
    setMotifAjustement('')
    setMode('ajuster')
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Validation — {employeName}</DialogTitle>
            <DialogDescription>
              {MOIS_LABELS[mois]} {annee} · KPI par KPI
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <p className="text-muted-foreground text-sm py-6 text-center">Chargement des saisies…</p>
          ) : list.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">
              Aucune saisie en attente pour ce collaborateur.
            </p>
          ) : current ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    KPI {currentIndex + 1} sur {list.length}
                  </span>
                  <span>{traitees} / {initialCount} traité(s)</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {mode === 'view' && (
                <>
                  <div className="rounded-xl border border-border/60 p-4 space-y-3 bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm leading-snug break-words">
                        {formaterNomKpiAffichage(current.kpiEmploye.catalogueKpi.nom)}
                      </p>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {current.kpiEmploye.catalogueKpi.type}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-background border p-3">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Réalisé</p>
                        <p className="text-lg font-semibold tabular-nums mt-0.5">
                          {current.valeur_affichée}
                          {current.kpiEmploye.catalogueKpi.unite && (
                            <span className="text-sm font-normal text-muted-foreground ml-1">
                              {current.kpiEmploye.catalogueKpi.unite}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="rounded-lg bg-background border p-3">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Cible</p>
                        <p className="text-lg font-semibold tabular-nums mt-0.5">{current.kpiEmploye.cible}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <NotationBadge taux={current.taux} showTaux />
                      {current.soumis_le && (
                        <span className="text-xs text-muted-foreground">
                          Soumis le{' '}
                          {new Date(current.soumis_le).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                      )}
                    </div>

                    {(current.commentaire?.trim() || current.preuves?.trim()) && (
                      <div className="space-y-2 pt-1 border-t border-border/50">
                        {current.commentaire?.trim() && (
                          <div className="rounded-lg bg-background border px-3 py-2.5 space-y-1">
                            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                              <MessageSquare className="h-3 w-3" />
                              Commentaire
                            </p>
                            <p className="text-sm leading-snug whitespace-pre-wrap break-words">
                              {current.commentaire.trim()}
                            </p>
                          </div>
                        )}
                        {current.preuves?.trim() && (
                          <div className="rounded-lg bg-background border px-3 py-2.5 space-y-1.5">
                            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                              <Paperclip className="h-3 w-3" />
                              Preuve jointe
                            </p>
                            {isPreuveFichier(current.preuves.trim()) ? (
                              <a
                                href={current.preuves.trim()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-2 text-sm hover:bg-muted/40 transition-colors min-w-0"
                              >
                                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                                  <FileText className="h-3.5 w-3.5" />
                                </span>
                                <span className="truncate min-w-0 flex-1 font-medium">
                                  {nomFichierPreuve(current.preuves.trim())}
                                </span>
                                <span className="text-[11px] text-muted-foreground shrink-0">Ouvrir</span>
                              </a>
                            ) : (
                              <p className="text-sm leading-snug whitespace-pre-wrap break-words text-muted-foreground">
                                {current.preuves.trim()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={currentIndex === 0 || submitting}
                      onClick={() => setCurrentIndex((i) => i - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-0.5" />
                      Précédent
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {list.length} restant{list.length > 1 ? 's' : ''}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={currentIndex >= list.length - 1 || submitting}
                      onClick={() => setCurrentIndex((i) => i + 1)}
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-0.5" />
                    </Button>
                  </div>

                  <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                    <Button
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setMotifRejet('')
                        setMode('rejeter')
                      }}
                      disabled={submitting}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Rejeter
                    </Button>
                    <Button variant="outline" onClick={openAjuster} disabled={submitting}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Ajuster
                    </Button>
                    <Button onClick={() => setConfirmValider(true)} disabled={submitting}>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Valider ce KPI
                    </Button>
                  </DialogFooter>
                </>
              )}

              {mode === 'rejeter' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Rejet de :{' '}
                    <span className="font-medium text-foreground">
                      {formaterNomKpiAffichage(current.kpiEmploye.catalogueKpi.nom)}
                    </span>
                  </p>
                  <div className="space-y-2">
                    <Label>Motif du rejet</Label>
                    <Textarea
                      value={motifRejet}
                      onChange={(e) => setMotifRejet(e.target.value)}
                      placeholder="Indiquez le motif…"
                      rows={3}
                    />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setMode('view')} disabled={submitting}>
                      Retour
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleRejeter}
                      disabled={!motifRejet.trim() || submitting}
                    >
                      Confirmer le rejet
                    </Button>
                  </DialogFooter>
                </div>
              )}

              {mode === 'ajuster' && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Ajustement :{' '}
                    <span className="font-medium text-foreground">
                      {formaterNomKpiAffichage(current.kpiEmploye.catalogueKpi.nom)}
                    </span>
                  </p>
                  <div className="space-y-2">
                    <Label>Nouvelle valeur</Label>
                    <Input
                      type="number"
                      step="any"
                      value={valeurAjustee}
                      onChange={(e) => setValeurAjustee(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Motif de l&apos;ajustement</Label>
                    <Textarea
                      value={motifAjustement}
                      onChange={(e) => setMotifAjustement(e.target.value)}
                      placeholder="Indiquez le motif…"
                      rows={3}
                    />
                  </div>
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setMode('view')} disabled={submitting}>
                      Retour
                    </Button>
                    <Button
                      onClick={handleAjuster}
                      disabled={
                        !motifAjustement.trim() ||
                        Number.isNaN(parseFloat(valeurAjustee.replace(',', '.'))) ||
                        submitting
                      }
                    >
                      Confirmer l&apos;ajustement
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmValider} onOpenChange={setConfirmValider}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valider ce KPI ?</AlertDialogTitle>
            <AlertDialogDescription>
              {current && (
                <>
                  Confirmer la validation de{' '}
                  <span className={cn('font-medium')}>
                    {formaterNomKpiAffichage(current.kpiEmploye.catalogueKpi.nom)}
                  </span>{' '}
                  ({Math.round(current.taux)} % d&apos;atteinte) ?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleValider} disabled={submitting}>
              Valider
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
