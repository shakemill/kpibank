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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  Lock,
  MessageSquare,
  PenLine,
  Save,
  Send,
  Star,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { calculerTauxAtteinte, getStatutSaisie, type TypeKpi } from '@/lib/saisie-utils'

const MOIS_LABELS: Record<number, string> = {
  1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril', 5: 'Mai', 6: 'Juin',
  7: 'Juillet', 8: 'Août', 9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre',
}

const NIVEAUX_COMPORTEMENTAL = [
  { value: 1, label: 'Débutant', desc: 'Ne maîtrise pas encore' },
  { value: 2, label: 'En développement', desc: 'Apprentissage en cours' },
  { value: 3, label: 'Maîtrise', desc: 'Autonome sur le sujet' },
  { value: 4, label: 'Expert', desc: 'Peut former les autres' },
] as const

function KpiTypeBadge({ type }: { type: string }) {
  if (type === 'QUANTITATIF')
    return (
      <Badge variant="secondary" className="gap-1 font-normal">
        <BarChart3 className="h-3 w-3" />
        Quantitatif
      </Badge>
    )
  if (type === 'QUALITATIF')
    return (
      <Badge variant="secondary" className="gap-1 font-normal">
        <Star className="h-3 w-3" />
        Qualitatif
      </Badge>
    )
  return (
    <Badge variant="secondary" className="gap-1 font-normal">
      <TrendingUp className="h-3 w-3" />
      Comportemental
    </Badge>
  )
}

type KpiEmployeItem = {
  id: number
  cible: number
  catalogueKpi: { id: number; nom: string; type: string; unite: string | null }
  cible_periode?: number
  mode_agregation?: string
  cible_mensuelle?: number
  cible_attendue_a_date?: number
  realise_cumule?: number
  taux_avancement_periode?: number
  mois_restants?: number
  saisie_mois_courant?: { valeur: number | null; statut: string; cible_ce_mois: number }
  historique?: Array<{ mois: number; valeur: number | null; cible: number; taux: number | null; statut: string | null }>
  periode_code?: string
  periode_nb_mois?: number
}

type SaisieItem = {
  id: number
  kpiEmployeId: number
  mois: number
  annee: number
  valeur_realisee: number | null
  valeur_ajustee: number | null
  commentaire: string | null
  preuves: string | null
  statut: string
  kpiEmploye: { id: number; cible: number; catalogueKpi: { id: number; nom: string; type: string; unite: string | null } }
}

type FormValues = Record<number, { valeur: string; commentaire: string; preuves: string }>

export default function SaisiePage() {
  const now = new Date()
  const [mois, setMois] = useState(now.getMonth() + 1)
  const [annee, setAnnee] = useState(now.getFullYear())
  const [kpiEmployes, setKpiEmployes] = useState<KpiEmployeItem[]>([])
  const [saisies, setSaisies] = useState<SaisieItem[]>([])
  const [statutPeriode, setStatutPeriode] = useState<string>('OUVERTE')
  const [delaiJour, setDelaiJour] = useState(10)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<FormValues>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/saisies?mois=${mois}&annee=${annee}`)
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? 'Chargement', variant: 'destructive' })
      return
    }
    const data = await res.json()
    setKpiEmployes(data.kpiEmployes ?? [])
    setSaisies(data.saisies ?? [])
    setStatutPeriode(data.statutPeriode ?? 'OUVERTE')
    setDelaiJour(data.delaiJour ?? 10)
    const next: FormValues = {}
    for (const k of data.kpiEmployes ?? []) {
      const s = (data.saisies ?? []).find((x: SaisieItem) => x.kpiEmployeId === k.id)
      const val = s?.valeur_ajustee ?? s?.valeur_realisee
      next[k.id] = {
        valeur: val != null ? String(val) : '',
        commentaire: s?.commentaire ?? '',
        preuves: s?.preuves ?? '',
      }
    }
    setForm(next)
  }, [mois, annee])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const canChangeMonth = (m: number, a: number) => {
    const statut = getStatutSaisie(m, a, delaiJour)
    return statut !== 'VERROUILLEE'
  }

  const moisOptions: { mois: number; annee: number; label: string }[] = []
  let m = mois
  let a = annee
  for (let i = 0; i < 24; i++) {
    if (canChangeMonth(m, a)) {
      moisOptions.push({ mois: m, annee: a, label: `${MOIS_LABELS[m]} ${a}` })
    }
    m--
    if (m < 1) {
      m = 12
      a--
    }
  }

  const setFormKpi = (kpiEmployeId: number, field: 'valeur' | 'commentaire' | 'preuves', value: string) => {
    setForm((prev) => ({
      ...prev,
      [kpiEmployeId]: {
        ...(prev[kpiEmployeId] ?? { valeur: '', commentaire: '', preuves: '' }),
        [field]: value,
      },
    }))
  }

  const getValeurNum = (kpiEmployeId: number): number | null => {
    const v = form[kpiEmployeId]?.valeur?.trim()
    if (v === '') return null
    const n = parseFloat(v.replace(',', '.'))
    return Number.isNaN(n) ? null : n
  }

  const allFilled = kpiEmployes.length > 0 && kpiEmployes.every((k) => {
    const val = getValeurNum(k.id)
    if (val == null) return false
    if (k.catalogueKpi.type === 'QUALITATIF' && !(form[k.id]?.commentaire?.trim())) return false
    if (k.catalogueKpi.type === 'COMPORTEMENTAL' && !(form[k.id]?.preuves?.trim())) return false
    return true
  })

  const isCardReadOnly = (kpiEmployeId: number) => {
    if (statutPeriode === 'VERROUILLEE') return true
    const s = saisies.find((x) => x.kpiEmployeId === kpiEmployeId)
    return s ? ['SOUMISE', 'VALIDEE', 'AJUSTEE'].includes(s.statut) : false
  }

  const handleSaveDraft = async () => {
    if (statutPeriode === 'VERROUILLEE') return
    setSaving(true)
    const updates = kpiEmployes.map((k) => {
      const val = getValeurNum(k.id)
      return fetch('/api/saisies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpiEmployeId: k.id,
          mois,
          annee,
          valeur_realisee: val ?? null,
          commentaire: form[k.id]?.commentaire?.trim() || null,
          preuves: form[k.id]?.preuves?.trim() || null,
        }),
      })
    })
    const results = await Promise.all(updates)
    setSaving(false)
    const failed = results.filter((r) => !r.ok)
    if (failed.length > 0) {
      const first = await failed[0].json().catch(() => ({}))
      toast({ title: 'Erreur', description: first?.error ?? 'Enregistrement', variant: 'destructive' })
      return
    }
    toast({ title: 'Brouillon enregistré' })
    fetchData()
  }

  const handleSubmit = async () => {
    if (!allFilled || statutPeriode === 'VERROUILLEE') return
    setSubmitting(true)
    const ids: number[] = []
    for (const k of kpiEmployes) {
      const s = saisies.find((x) => x.kpiEmployeId === k.id)
      const val = getValeurNum(k.id)
      const res = await fetch('/api/saisies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpiEmployeId: k.id,
          mois,
          annee,
          valeur_realisee: val ?? null,
          commentaire: form[k.id]?.commentaire?.trim() || null,
          preuves: form[k.id]?.preuves?.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'Erreur', description: data?.error ?? 'Enregistrement', variant: 'destructive' })
        setSubmitting(false)
        return
      }
      const created = await res.json()
      ids.push(created.id)
    }
    for (const id of ids) {
      const res = await fetch(`/api/saisies/${id}/soumettre`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast({ title: 'Erreur', description: data?.error ?? 'Soumission', variant: 'destructive' })
        setSubmitting(false)
        return
      }
    }
    setSubmitting(false)
    toast({ title: 'Saisie soumise pour validation' })
    fetchData()
  }

  const progressColor = (taux: number) => {
    if (taux < 70) return 'bg-red-500'
    if (taux < 90) return 'bg-amber-500'
    if (taux < 100) return 'bg-green-500'
    return 'bg-blue-500'
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PenLine className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Saisie des réalisations</h1>
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {MOIS_LABELS[mois]} {annee}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
          {!mounted ? (
            <div className="h-10 w-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm flex items-center">
              {MOIS_LABELS[mois]} {annee}
            </div>
          ) : (
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
                {moisOptions.map((opt) => (
                  <SelectItem key={`${opt.mois}-${opt.annee}`} value={`${opt.mois}-${opt.annee}`}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {statutPeriode === 'EN_RETARD' && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <AlertDescription className="flex items-center gap-2">
            Votre saisie est en retard, votre manager est informé.
          </AlertDescription>
        </Alert>
      )}
      {statutPeriode === 'VERROUILLEE' && (
        <Alert variant="destructive" className="border-red-500/50">
          <Lock className="h-4 w-4 shrink-0" />
          <AlertDescription>
            La période de saisie est clôturée, contactez votre manager.
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Chargement des KPI...</p>
        </div>
      ) : kpiEmployes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <ClipboardList className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center">Aucun KPI validé pour ce mois.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {kpiEmployes.map((k) => {
            const type = k.catalogueKpi.type as TypeKpi
            const unite = k.catalogueKpi.unite ?? ''
            const cibleCeMois = k.saisie_mois_courant?.cible_ce_mois ?? k.cible_mensuelle ?? k.cible
            const valNum = getValeurNum(k.id)
            const taux = valNum != null && cibleCeMois > 0
              ? calculerTauxAtteinte(valNum, cibleCeMois, type)
              : 0
            const saisie = saisies.find((s) => s.kpiEmployeId === k.id)
            const readOnly = isCardReadOnly(k.id)
            const cumulSiSaisi =
              valNum != null && k.realise_cumule != null && k.mode_agregation === 'CUMUL'
                ? k.realise_cumule + valNum
                : valNum != null ? valNum : null
            const pctPeriodeSiSaisi =
              k.cible_periode != null && k.cible_periode > 0 && cumulSiSaisi != null
                ? Math.round((cumulSiSaisi / k.cible_periode) * 1000) / 10
                : null

            return (
              <Card key={k.id} className="border-border/50 overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {type === 'QUANTITATIF' && <BarChart3 className="h-5 w-5" />}
                        {type === 'QUALITATIF' && <Star className="h-5 w-5" />}
                        {type === 'COMPORTEMENTAL' && <TrendingUp className="h-5 w-5" />}
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {k.catalogueKpi.nom}
                          {unite && <span className="text-muted-foreground font-normal"> ({unite})</span>}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1.5 mt-0.5">
                          <Target className="h-3.5 w-3.5" />
                          Cible du mois : {typeof cibleCeMois === 'number' ? cibleCeMois.toFixed(1) : cibleCeMois}
                          {unite && ` ${unite}`}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <KpiTypeBadge type={type} />
                      {k.poids != null && (
                        <Badge variant="outline" className="font-normal">Poids {k.poids}%</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* CIBLE CE MOIS / RÉALISÉ CUMULÉ / ATTENDU À DATE */}
                  {(k.cible_mensuelle != null || k.realise_cumule != null || k.cible_attendue_a_date != null) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Cible ce mois</p>
                        <p className="text-lg font-semibold">
                          {cibleCeMois != null ? (Number(cibleCeMois) === Math.round(Number(cibleCeMois)) ? String(cibleCeMois) : Number(cibleCeMois).toFixed(1)) : '—'}
                          {unite && <span className="text-muted-foreground font-normal text-sm"> {unite}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">ce mois</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Réalisé cumulé</p>
                        <p className="text-lg font-semibold">
                          {k.realise_cumule != null ? (Number(k.realise_cumule) === Math.round(Number(k.realise_cumule)) ? String(k.realise_cumule) : k.realise_cumule.toFixed(1)) : '—'}
                          {unite && <span className="text-muted-foreground font-normal text-sm"> {unite}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {k.historique?.filter((h) => h.valeur != null).length ?? 0} mois saisis
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Attendu à date</p>
                        <p className="text-lg font-semibold">
                          {k.cible_attendue_a_date != null ? (Number(k.cible_attendue_a_date) === Math.round(Number(k.cible_attendue_a_date)) ? String(k.cible_attendue_a_date) : k.cible_attendue_a_date.toFixed(1)) : '—'}
                          {unite && <span className="text-muted-foreground font-normal text-sm"> {unite}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">à fin du mois</p>
                      </div>
                    </div>
                  )}

                  {/* Cible période + barre progression */}
                  {k.cible_periode != null && k.periode_code != null && (
                    <div className="space-y-1.5">
                      <p className="text-sm text-muted-foreground">
                        Cible période complète : {k.cible_periode} {unite && `${unite} `}
                        ({k.periode_code}
                        {k.periode_nb_mois != null && ` — ${k.periode_nb_mois} mois`})
                      </p>
                      {k.taux_avancement_periode != null && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Progression période</span>
                            <span>{k.taux_avancement_periode}%</span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={['h-full rounded-full transition-all', progressColor(k.taux_avancement_periode)].join(' ')}
                              style={{ width: `${Math.min(100, k.taux_avancement_periode)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timeline historique */}
                  {k.historique != null && k.historique.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                      {k.historique.map((h) => {
                        const isCurrent = h.mois === mois
                        const label = MOIS_LABELS[h.mois]?.slice(0, 3) ?? String(h.mois)
                        const val = h.valeur != null ? String(h.valeur) : '?'
                        return (
                          <span key={h.mois} className={isCurrent ? 'font-medium text-primary' : ''}>
                            {isCurrent && '['}
                            {label}:{val}
                            {isCurrent && ']'}
                            {' '}
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {/* Saisie du mois de [Mois Année] */}
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">
                      Saisie du mois de {MOIS_LABELS[mois]} {annee}
                    </h4>
                  {type === 'QUANTITATIF' && (
                    <>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <Target className="h-3.5 w-3.5 text-muted-foreground" />
                          Valeur réalisée
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          value={form[k.id]?.valeur ?? ''}
                          onChange={(e) => setFormKpi(k.id, 'valeur', e.target.value)}
                          disabled={readOnly}
                          placeholder="0"
                          className="max-w-[200px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                          Commentaire (optionnel)
                        </Label>
                        <Textarea
                          value={form[k.id]?.commentaire ?? ''}
                          onChange={(e) => setFormKpi(k.id, 'commentaire', e.target.value)}
                          disabled={readOnly}
                          placeholder="Commentaire"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          Preuves (optionnel)
                        </Label>
                        <Input
                          value={form[k.id]?.preuves ?? ''}
                          onChange={(e) => setFormKpi(k.id, 'preuves', e.target.value)}
                          disabled={readOnly}
                          placeholder="Lien ou référence"
                        />
                      </div>
                    </>
                  )}

                  {type === 'QUALITATIF' && (
                    <>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <Star className="h-3.5 w-3.5 text-muted-foreground" />
                          Note réalisée (ex: 4.2)
                        </Label>
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          max={5}
                          value={form[k.id]?.valeur ?? ''}
                          onChange={(e) => setFormKpi(k.id, 'valeur', e.target.value)}
                          disabled={readOnly}
                          placeholder="0 à 5"
                          className="max-w-[120px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          Source de la note (obligatoire)
                        </Label>
                        <Textarea
                          value={form[k.id]?.commentaire ?? ''}
                          onChange={(e) => setFormKpi(k.id, 'commentaire', e.target.value)}
                          disabled={readOnly}
                          placeholder="Indiquez la source de la note"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          Preuves (optionnel)
                        </Label>
                        <Input
                          value={form[k.id]?.preuves ?? ''}
                          onChange={(e) => setFormKpi(k.id, 'preuves', e.target.value)}
                          disabled={readOnly}
                          placeholder="Lien ou référence"
                        />
                      </div>
                    </>
                  )}

                  {type === 'COMPORTEMENTAL' && (
                    <>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                          Niveau
                        </Label>
                        <Select
                          value={form[k.id]?.valeur ?? ''}
                          onValueChange={(v) => setFormKpi(k.id, 'valeur', v)}
                          disabled={readOnly}
                        >
                          <SelectTrigger className="max-w-[320px]">
                            <SelectValue placeholder="Choisir le niveau" />
                          </SelectTrigger>
                          <SelectContent>
                            {NIVEAUX_COMPORTEMENTAL.map((n) => (
                              <SelectItem key={n.value} value={String(n.value)}>
                                {n.value} — {n.label} : {n.desc}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          Preuves (obligatoire)
                        </Label>
                        <Textarea
                          value={form[k.id]?.preuves ?? ''}
                          onChange={(e) => setFormKpi(k.id, 'preuves', e.target.value)}
                          disabled={readOnly}
                          placeholder="Justifier le niveau déclaré"
                          rows={3}
                        />
                      </div>
                    </>
                  )}

                  {(type === 'QUANTITATIF' || type === 'QUALITATIF') && (
                    <>
                      <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5">
                            <Target className="h-3.5 w-3.5 text-muted-foreground" />
                            {valNum != null ? `${Math.round(taux)}% de la cible` : '—'}
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={['h-full transition-all rounded-full', progressColor(taux)].join(' ')}
                            style={{ width: `${Math.min(100, taux)}%` }}
                          />
                        </div>
                      </div>
                      {valNum != null && cibleCeMois > 0 && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 p-3 text-sm">
                          <p className="font-medium text-blue-800 dark:text-blue-200">
                            Si je saisis {valNum} → {Math.round(taux)}% de la cible mensuelle
                          </p>
                          {k.mode_agregation === 'CUMUL' && cumulSiSaisi != null && k.cible_periode != null && (
                            <p className="text-muted-foreground mt-0.5">
                              Cumul serait : {cumulSiSaisi} / {k.cible_periode} = {pctPeriodeSiSaisi}% de la période
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {saisie && ['SOUMISE', 'VALIDEE', 'AJUSTEE', 'REJETEE'].includes(saisie.statut) && (
                    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {saisie.statut === 'VALIDEE' && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                      {saisie.statut === 'AJUSTEE' && <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />}
                      {saisie.statut === 'SOUMISE' && <Loader2 className="h-4 w-4 animate-spin text-amber-600 shrink-0" />}
                      {saisie.statut === 'REJETEE' && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                      <span className="text-muted-foreground">
                        Statut : {saisie.statut === 'VALIDEE' && 'Validée'}
                        {saisie.statut === 'AJUSTEE' && 'Ajustée'}
                        {saisie.statut === 'SOUMISE' && 'En attente de validation'}
                        {saisie.statut === 'REJETEE' && 'Rejetée'}
                      </span>
                    </div>
                  )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {!loading && kpiEmployes.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4">
          <Button
            variant="outline"
            size="default"
            onClick={handleSaveDraft}
            disabled={statutPeriode === 'VERROUILLEE' || saving}
            className="gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer brouillon
          </Button>
          <Button
            size="default"
            onClick={handleSubmit}
            disabled={!allFilled || statutPeriode === 'VERROUILLEE' || submitting}
            className="gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Soumettre pour validation
          </Button>
          {!allFilled && kpiEmployes.length > 0 && (
            <span className="text-muted-foreground text-sm flex items-center gap-1.5 ml-auto">
              <Target className="h-3.5 w-3.5" />
              Remplissez tous les champs pour pouvoir soumettre
            </span>
          )}
        </div>
      )}
    </div>
  )
}
