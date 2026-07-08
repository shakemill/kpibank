'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ValidationKpiParKpiModal,
  type SaisieValidation,
} from '@/components/validation/ValidationKpiParKpiModal'
import { Calendar, AlertCircle, Unlock, Users, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const MOIS_LABELS: Record<number, string> = {
  1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril', 5: 'Mai', 6: 'Juin',
  7: 'Juillet', 8: 'Août', 9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre',
}

type Manquante = {
  employeId: number
  nom: string
  prenom: string
  email: string
}

type CollaborateurEnAttente = {
  employeId: number
  prenom: string
  nom: string
  email: string
  count: number
}

export default function ValidationPage() {
  const now = new Date()
  const [mois, setMois] = useState(now.getMonth() + 1)
  const [annee, setAnnee] = useState(now.getFullYear())
  const [list, setList] = useState<SaisieValidation[]>([])
  const [manquantes, setManquantes] = useState<Manquante[]>([])
  const [statutPeriodeManquantes, setStatutPeriodeManquantes] = useState<string>('OUVERTE')
  const [loading, setLoading] = useState(true)
  const [loadingManquantes, setLoadingManquantes] = useState(false)
  const [ouvrirPeriodeLoading, setOuvrirPeriodeLoading] = useState<number | null>(null)
  const [validationModal, setValidationModal] = useState<CollaborateurEnAttente | null>(null)

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

  const collaborateurs = useMemo(() => {
    const map = new Map<number, CollaborateurEnAttente>()
    for (const s of list) {
      const existing = map.get(s.employeId)
      if (existing) {
        existing.count += 1
      } else {
        map.set(s.employeId, {
          employeId: s.employeId,
          prenom: s.employe.prenom,
          nom: s.employe.nom,
          email: s.employe.email,
          count: 1,
        })
      }
    }
    return [...map.values()].sort((a, b) =>
      `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, 'fr')
    )
  }, [list])

  const totalSaisies = list.length

  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Validation des saisies</h1>
          <p className="text-muted-foreground mt-1">
            Choisissez un collaborateur, puis validez ses KPI un par un.
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
          <TabsTrigger value="soumises">
            Collaborateurs à valider
            {collaborateurs.length > 0 && (
              <Badge variant="secondary" className="ml-2 font-normal">
                {collaborateurs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="manquantes">Saisies manquantes</TabsTrigger>
        </TabsList>

        <TabsContent value="soumises" className="space-y-4">
          <Card className="border-border/50 overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base">Étape 1 — Choisir un collaborateur</CardTitle>
                  <CardDescription>
                    {MOIS_LABELS[mois]} {annee}
                    {totalSaisies > 0 && (
                      <span className="text-foreground/80">
                        {' '}
                        · {totalSaisies} saisie{totalSaisies > 1 ? 's' : ''} en attente
                      </span>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="min-w-0">
              {loading ? (
                <p className="text-muted-foreground">Chargement…</p>
              ) : collaborateurs.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center">
                  Aucune saisie en attente de validation pour ce mois.
                </p>
              ) : (
                <div className="space-y-2">
                  {collaborateurs.map((c, idx) => (
                    <button
                      key={c.employeId}
                      type="button"
                      onClick={() => setValidationModal(c)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-xl border border-border/60 p-4 text-left transition-colors',
                        'hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        idx % 2 === 1 ? 'bg-muted/20' : 'bg-background'
                      )}
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {c.prenom.charAt(0)}
                          {c.nom.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {c.prenom} {c.nom}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{c.email}</p>
                      </div>
                      <Badge className="shrink-0 bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/15">
                        {c.count} KPI
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {collaborateurs.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Étape 2 : ouvrez un collaborateur pour valider, ajuster ou rejeter chaque KPI individuellement.
            </p>
          )}
        </TabsContent>

        <TabsContent value="manquantes" className="space-y-4">
          <Card className="border-border/50 overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
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
            <CardContent className="min-w-0">
              {loadingManquantes ? (
                <p className="text-muted-foreground">Chargement…</p>
              ) : manquantes.length === 0 ? (
                <p className="text-muted-foreground">Aucune saisie manquante.</p>
              ) : (
                <div className="space-y-3">
                  {manquantes.map((m) => (
                    <div
                      key={m.employeId}
                      className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between min-w-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {m.prenom} {m.nom}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{m.email}</p>
                      </div>
                      {statutPeriodeManquantes === 'VERROUILLEE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 shrink-0 self-start sm:self-center"
                          onClick={() => handleOuvrirPeriode(m.employeId)}
                          disabled={ouvrirPeriodeLoading !== null}
                        >
                          {ouvrirPeriodeLoading === m.employeId ? (
                            'Ouverture…'
                          ) : (
                            <>
                              <Unlock className="h-3.5 w-3.5" />
                              Ouvrir la saisie
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {validationModal && (
        <ValidationKpiParKpiModal
          employeId={validationModal.employeId}
          employeName={`${validationModal.prenom} ${validationModal.nom}`}
          mois={mois}
          annee={annee}
          isOpen={!!validationModal}
          onClose={() => setValidationModal(null)}
          onUpdate={fetchSoumises}
        />
      )}
    </div>
  )
}
