'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle } from 'lucide-react'

const MOIS_LABELS: Record<number, string> = {
  1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril', 5: 'Mai', 6: 'Juin',
  7: 'Juillet', 8: 'Août', 9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre',
}

type SaisieSoumise = {
  id: number
  valeur_affichée: number
  taux: number
  kpiEmploye: { cible: number; catalogueKpi: { nom: string; type: string; unite: string | null } }
}

export interface ValidationRapideModalProps {
  employeId: number
  employeName: string
  mois: number
  annee: number
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

export function ValidationRapideModal({
  employeId,
  employeName,
  mois,
  annee,
  isOpen,
  onClose,
  onUpdate,
}: ValidationRapideModalProps) {
  const [list, setList] = useState<SaisieSoumise[]>([])
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)

  const fetchSoumises = useCallback(async () => {
    if (!isOpen || !employeId) return
    setLoading(true)
    const res = await fetch(
      `/api/saisies/soumises?employeId=${employeId}&mois=${mois}&annee=${annee}`
    )
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data?.error ?? 'Chargement saisies')
      setList([])
      return
    }
    const data = await res.json()
    setList(data.list ?? [])
  }, [isOpen, employeId, mois, annee])

  useEffect(() => {
    if (isOpen) fetchSoumises()
  }, [isOpen, fetchSoumises])

  const handleToutValider = async () => {
    if (list.length === 0) return
    setValidating(true)
    let ok = 0
    for (const s of list) {
      const res = await fetch(`/api/saisies/${s.id}/valider`, { method: 'POST' })
      if (res.ok) ok += 1
      else {
        const data = await res.json().catch(() => ({}))
        toast.error(data?.error ?? `Erreur validation KPI`)
      }
    }
    setValidating(false)
    if (ok > 0) {
      toast.success(ok === list.length ? 'Toutes les saisies ont été validées' : `${ok} saisie(s) validée(s)`)
      onUpdate()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Valider les saisies de {employeName}</DialogTitle>
          <DialogDescription>
            {MOIS_LABELS[mois] ?? mois} {annee}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground text-sm py-4">Chargement...</p>
        ) : list.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">Aucune saisie en attente de validation.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KPI</TableHead>
                  <TableHead className="text-right">Valeur</TableHead>
                  <TableHead className="text-right">Cible</TableHead>
                  <TableHead className="text-right">Taux</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.kpiEmploye.catalogueKpi.nom}</TableCell>
                    <TableCell className="text-right">{s.valeur_affichée}</TableCell>
                    <TableCell className="text-right">{s.kpiEmploye.cible}</TableCell>
                    <TableCell className="text-right">
                      <span className={s.taux >= 100 ? 'text-green-600' : s.taux >= 70 ? 'text-orange-600' : 'text-red-600'}>
                        {Math.round(s.taux)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
              <Button onClick={handleToutValider} disabled={validating} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                {validating ? 'Validation...' : 'Tout valider'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
