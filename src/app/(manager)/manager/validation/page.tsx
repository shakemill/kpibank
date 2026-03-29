'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Check, Pencil, X, Calendar, AlertCircle, Unlock } from 'lucide-react'

const MOIS_LABELS: Record<number, string> = {
  1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril', 5: 'Mai', 6: 'Juin',
  7: 'Juillet', 8: 'Août', 9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre',
}

type SaisieSoumise = {
  id: number
  employeId: number
  mois: number
  annee: number
  valeur_realisee: number | null
  valeur_ajustee: number | null
  valeur_affichée: number
  taux: number
  soumis_le: string | null
  employe: { id: number; nom: string; prenom: string; email: string }
  kpiEmploye: {
    id: number
    cible: number
    catalogueKpi: { id: number; nom: string; type: string; unite: string | null }
  }
}

type Manquante = {
  employeId: number
  nom: string
  prenom: string
  email: string
}

export default function ValidationPage() {
  const now = new Date()
  const [mois, setMois] = useState(now.getMonth() + 1)
  const [annee, setAnnee] = useState(now.getFullYear())
  const [list, setList] = useState<SaisieSoumise[]>([])
  const [manquantes, setManquantes] = useState<Manquante[]>([])
  const [statutPeriodeManquantes, setStatutPeriodeManquantes] = useState<string>('OUVERTE')
  const [loading, setLoading] = useState(true)
  const [loadingManquantes, setLoadingManquantes] = useState(false)
  const [ouvrirPeriodeLoading, setOuvrirPeriodeLoading] = useState<number | null>(null)
  const [rejeterModal, setRejeterModal] = useState<SaisieSoumise | null>(null)
  const [ajusterModal, setAjusterModal] = useState<SaisieSoumise | null>(null)
  const [motifRejet, setMotifRejet] = useState('')
  const [valeurAjustee, setValeurAjustee] = useState('')
  const [motifAjustement, setMotifAjustement] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmValider, setConfirmValider] = useState<SaisieSoumise | null>(null)
  const [confirmToutValider, setConfirmToutValider] = useState<{ employeId: number; nom: string; count: number } | null>(null)
  const [confirmRejeter, setConfirmRejeter] = useState(false)
  const [confirmAjuster, setConfirmAjuster] = useState(false)

  const fetchSoumises = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/saisies/soumises?mois=${mois}&annee=${annee}`)
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? 'Chargement', variant: 'destructive' })
      return
    }
    const data = await res.json()
    setList(data.list ?? [])
  }, [mois, annee])

  const fetchManquantes = useCallback(async () => {
    setLoadingManquantes(true)
    const res = await fetch(`/api/saisies/manquantes?mois=${mois}&annee=${annee}`)
    setLoadingManquantes(false)
    if (!res.ok) return
    const data = await res.json()
    setManquantes(data.manquantes ?? [])
    setStatutPeriodeManquantes(data.statutPeriode ?? 'OUVERTE')
  }, [mois, annee])

  const handleOuvrirPeriode = async (employeId: number) => {
    setOuvrirPeriodeLoading(employeId)
    const res = await fetch('/api/saisies/ouvrir-periode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeId, mois, annee }),
    })
    setOuvrirPeriodeLoading(null)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Ouverture de la période', variant: 'destructive' })
      return
    }
    toast({ title: 'Période ouverte', description: 'Le collaborateur peut désormais saisir pour ce mois.' })
    fetchManquantes()
  }

  useEffect(() => {
    fetchSoumises()
  }, [fetchSoumises])

  useEffect(() => {
    fetchManquantes()
  }, [fetchManquantes])

  const handleValider = async (saisie: SaisieSoumise) => {
    setSubmitting(true)
    const res = await fetch(`/api/saisies/${saisie.id}/valider`, { method: 'POST' })
    setSubmitting(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Validation', variant: 'destructive' })
      return
    }
    toast({ title: 'Saisie validée' })
    fetchSoumises()
  }

  const handleToutValider = async (employeId: number) => {
    const toValidate = list.filter((s) => s.employeId === employeId)
    if (toValidate.length === 0) return
    setSubmitting(true)
    for (const s of toValidate) {
      const res = await fetch(`/api/saisies/${s.id}/valider`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'Erreur', description: data?.error ?? 'Validation', variant: 'destructive' })
        setSubmitting(false)
        return
      }
    }
    setSubmitting(false)
    toast({ title: 'Toutes les saisies de cet employé ont été validées' })
    fetchSoumises()
  }

  const openRejeter = (saisie: SaisieSoumise) => {
    setRejeterModal(saisie)
    setMotifRejet('')
  }

  const handleRejeter = async () => {
    if (!rejeterModal || !motifRejet.trim()) {
      toast({ title: 'Le motif est obligatoire', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    const res = await fetch(`/api/saisies/${rejeterModal.id}/rejeter`, {
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
    setRejeterModal(null)
    setMotifRejet('')
    fetchSoumises()
  }

  const openAjuster = (saisie: SaisieSoumise) => {
    setAjusterModal(saisie)
    setValeurAjustee(String(saisie.valeur_affichée ?? ''))
    setMotifAjustement('')
  }

  const handleAjuster = async () => {
    if (!ajusterModal) return
    const val = parseFloat(valeurAjustee.replace(',', '.'))
    if (Number.isNaN(val)) {
      toast({ title: 'Valeur invalide', variant: 'destructive' })
      return
    }
    if (!motifAjustement.trim()) {
      toast({ title: 'Le motif d\'ajustement est obligatoire', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    const res = await fetch(`/api/saisies/${ajusterModal.id}/ajuster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valeur_ajustee: val,
        motif_ajustement: motifAjustement.trim(),
      }),
    })
    setSubmitting(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Ajustement', variant: 'destructive' })
      return
    }
    toast({ title: 'Saisie ajustée' })
    setAjusterModal(null)
    setValeurAjustee('')
    setMotifAjustement('')
    fetchSoumises()
  }

  const employeIds = [...new Set(list.map((s) => s.employeId))]

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Validation des saisies</h1>
          <p className="text-muted-foreground mt-1">
            Valider, ajuster ou rejeter les saisies mensuelles soumises par votre équipe.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Select
            value={`${mois}-${annee}`}
            onValueChange={(v) => {
              const [m, a] = v.split('-').map(Number)
              setMois(m)
              setAnnee(a)
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Mois" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, i) => {
                let m = now.getMonth() + 1 - i
                let a = now.getFullYear()
                while (m < 1) {
                  m += 12
                  a -= 1
                }
                return { mois: m, annee: a, label: `${MOIS_LABELS[m]} ${a}` }
              }).map((opt) => (
                <SelectItem key={`${opt.mois}-${opt.annee}`} value={`${opt.mois}-${opt.annee}`}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="soumises" className="space-y-4">
        <TabsList>
          <TabsTrigger value="soumises">Saisies en attente</TabsTrigger>
          <TabsTrigger value="manquantes">Saisies manquantes</TabsTrigger>
        </TabsList>

        <TabsContent value="soumises" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Saisies soumises</CardTitle>
                  <CardDescription>
                    {MOIS_LABELS[mois]} {annee} — Valider, ajuster ou rejeter
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Chargement...</p>
              ) : list.length === 0 ? (
                <p className="text-muted-foreground">Aucune saisie en attente de validation.</p>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employé</TableHead>
                      <TableHead>KPI</TableHead>
                      <TableHead>Mois</TableHead>
                      <TableHead>Valeur saisie</TableHead>
                      <TableHead>Cible</TableHead>
                      <TableHead>Taux</TableHead>
                      <TableHead>Soumis le</TableHead>
                      <TableHead className="w-[220px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.employe.prenom} {s.employe.nom}
                        </TableCell>
                        <TableCell>
                          {s.kpiEmploye.catalogueKpi.nom}
                          {s.kpiEmploye.catalogueKpi.unite && ` (${s.kpiEmploye.catalogueKpi.unite})`}
                        </TableCell>
                        <TableCell>{MOIS_LABELS[s.mois]} {s.annee}</TableCell>
                        <TableCell>{s.valeur_affichée}</TableCell>
                        <TableCell>{s.kpiEmploye.cible}</TableCell>
                        <TableCell>{Math.round(s.taux)}%</TableCell>
                        <TableCell>
                          {s.soumis_le
                            ? new Date(s.soumis_le).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            : '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-nowrap gap-1 items-center shrink-0">
                            <Button
                              size="sm"
                              className="shrink-0 whitespace-nowrap"
                              variant="default"
                              onClick={() => setConfirmValider(s)}
                              disabled={submitting}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Valider
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 whitespace-nowrap"
                              onClick={() => openAjuster(s)}
                              disabled={submitting}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Ajuster
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 whitespace-nowrap text-destructive hover:text-destructive"
                              onClick={() => openRejeter(s)}
                              disabled={submitting}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Rejeter
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
              {list.length > 0 && employeIds.length > 0 && (
                <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground mr-2">Tout valider pour un employé :</span>
                  {employeIds.map((eid) => {
                    const s = list.find((x) => x.employeId === eid)
                    const nom = s ? `${s.employe.prenom} ${s.employe.nom}` : ''
                    const count = list.filter((x) => x.employeId === eid).length
                    return (
                      <Button
                        key={eid}
                        variant="secondary"
                        size="sm"
                        onClick={() => setConfirmToutValider({ employeId: eid, nom: nom, count })}
                        disabled={submitting}
                      >
                        {nom} ({count})
                      </Button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manquantes" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-base">Saisies manquantes</CardTitle>
                  <CardDescription>
                    Employés n&apos;ayant pas encore saisi pour {MOIS_LABELS[mois]} {annee}
                    {statutPeriodeManquantes === 'VERROUILLEE' && (
                      <span className="block mt-1 text-amber-600 dark:text-amber-400">
                        Période dépassée : vous pouvez ouvrir la saisie pour un collaborateur.
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingManquantes ? (
                <p className="text-muted-foreground">Chargement...</p>
              ) : manquantes.length === 0 ? (
                <p className="text-muted-foreground">Aucune saisie manquante.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Prénom</TableHead>
                      <TableHead>Email</TableHead>
                      {statutPeriodeManquantes === 'VERROUILLEE' && (
                        <TableHead className="w-[140px]">Action</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manquantes.map((m) => (
                      <TableRow key={m.employeId}>
                        <TableCell className="font-medium">{m.nom}</TableCell>
                        <TableCell>{m.prenom}</TableCell>
                        <TableCell className="text-muted-foreground">{m.email}</TableCell>
                        {statutPeriodeManquantes === 'VERROUILLEE' && (
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => handleOuvrirPeriode(m.employeId)}
                              disabled={ouvrirPeriodeLoading !== null}
                            >
                              {ouvrirPeriodeLoading === m.employeId ? (
                                <>Ouverture...</>
                              ) : (
                                <>
                                  <Unlock className="h-3.5 w-3.5" />
                                  Ouvrir la saisie
                                </>
                              )}
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejeterModal} onOpenChange={(o) => !o && setRejeterModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la saisie</DialogTitle>
            <DialogDescription>
              Le collaborateur pourra modifier et resoumettre. Le motif est obligatoire.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motif du rejet</Label>
            <Textarea
              value={motifRejet}
              onChange={(e) => setMotifRejet(e.target.value)}
              placeholder="Indiquez le motif du rejet..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejeterModal(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => setConfirmRejeter(true)} disabled={!motifRejet.trim() || submitting}>
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!ajusterModal} onOpenChange={(o) => !o && setAjusterModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuster la saisie</DialogTitle>
            <DialogDescription>
              Saisir la nouvelle valeur et le motif. La saisie sera marquée comme ajustée.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nouvelle valeur</Label>
              <Input
                type="number"
                step="any"
                value={valeurAjustee}
                onChange={(e) => setValeurAjustee(e.target.value)}
                placeholder="Valeur"
              />
            </div>
            <div className="space-y-2">
              <Label>Motif de l&apos;ajustement (obligatoire)</Label>
              <Textarea
                value={motifAjustement}
                onChange={(e) => setMotifAjustement(e.target.value)}
                placeholder="Indiquez le motif..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAjusterModal(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => setConfirmAjuster(true)}
              disabled={
                !motifAjustement.trim() ||
                Number.isNaN(parseFloat(valeurAjustee.replace(',', '.'))) ||
                submitting
              }
            >
              Ajuster
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmValider} onOpenChange={(o) => !o && setConfirmValider(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la validation</AlertDialogTitle>
            <AlertDialogDescription>
              Valider la saisie de {confirmValider ? `${confirmValider.employe.prenom} ${confirmValider.employe.nom}` : ''} pour {confirmValider ? `${confirmValider.kpiEmploye.catalogueKpi.nom}` : ''} ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmValider && handleValider(confirmValider)}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmToutValider} onOpenChange={(o) => !o && setConfirmToutValider(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valider toutes les saisies</AlertDialogTitle>
            <AlertDialogDescription>
              Valider les {confirmToutValider?.count ?? 0} saisie(s) de {confirmToutValider?.nom ?? ''} ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmToutValider && handleToutValider(confirmToutValider.employeId)}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRejeter} onOpenChange={(o) => !o && setConfirmRejeter(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le rejet</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir rejeter cette saisie ? L&apos;employé devra la modifier et resoumettre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejeter}>
              Confirmer le rejet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAjuster} onOpenChange={(o) => !o && setConfirmAjuster(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l&apos;ajustement</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir ajuster cette saisie ? La nouvelle valeur sera enregistrée et la saisie marquée comme ajustée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleAjuster}>
              Confirmer l&apos;ajustement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
