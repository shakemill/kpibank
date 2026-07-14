'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
import { GrilleReference } from '@/components/notation/GrilleReference'
import { useNotationGrille } from '@/contexts/notation-grille-context'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CalendarX,
  CheckCircle2,
  ClipboardList,
  ClipboardX,
  FileText,
  Loader2,
  Lock,
  MessageSquare,
  Paperclip,
  PenLine,
  Save,
  Send,
  Star,
  Target,
  TrendingUp,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { calculerTauxAtteinte, getStatutSaisie, isSaisieModifiable, libellerRealisePeriode, type ModeAgregation, type SensCalculKpi, type TypeKpi } from '@/lib/saisie-utils'

function nomFichierPreuve(url: string): string {
  try {
    const last = decodeURIComponent(url.split('/').pop() ?? '')
    // timestamp-token-basename.ext → afficher basename.ext si possible
    const m = last.match(/^\d+-[a-f0-9]+-(.+)$/i)
    return (m?.[1] ?? last) || 'Fichier'
  } catch {
    return 'Fichier'
  }
}

function isPreuveFichier(value: string): boolean {
  return value.startsWith('/uploads/') || /^https?:\/\//i.test(value)
}

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

type KpiTypeKey = 'QUANTITATIF' | 'QUALITATIF' | 'COMPORTEMENTAL'

const KPI_TYPE_THEME: Record<
  KpiTypeKey,
  {
    card: string
    header: string
    icon: string
    badge: string
    saisie: string
    taux: string
    preview: string
    blocks: { cible: string; cumul: string; attendu: string }
    label: { cible: string; cumul: string; attendu: string }
  }
> = {
  QUANTITATIF: {
    card: 'border border-border/60 bg-card',
    header: 'border-b border-border/50 bg-muted/20',
    icon: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    badge: 'bg-muted text-muted-foreground border-border/60',
    saisie: 'rounded-lg border border-border/60 bg-muted/10 p-3',
    taux: 'rounded-lg border border-border/50 bg-muted/15 p-2',
    preview: 'rounded-md border border-border/50 bg-muted/10 px-2 py-1.5 text-xs',
    blocks: {
      cible: 'rounded-md border border-border/50 bg-muted/15 px-2.5 py-2',
      cumul: 'rounded-md border border-border/50 bg-muted/15 px-2.5 py-2',
      attendu: 'rounded-md border border-border/50 bg-muted/15 px-2.5 py-2',
    },
    label: {
      cible: 'text-muted-foreground',
      cumul: 'text-muted-foreground',
      attendu: 'text-muted-foreground',
    },
  },
  QUALITATIF: {
    card: 'border border-border/60 bg-card',
    header: 'border-b border-border/50 bg-muted/20',
    icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    badge: 'bg-muted text-muted-foreground border-border/60',
    saisie: 'rounded-lg border border-border/60 bg-muted/10 p-3',
    taux: 'rounded-lg border border-border/50 bg-muted/15 p-2',
    preview: 'rounded-md border border-border/50 bg-muted/10 px-2 py-1.5 text-xs',
    blocks: {
      cible: 'rounded-md border border-border/50 bg-muted/15 px-2.5 py-2',
      cumul: 'rounded-md border border-border/50 bg-muted/15 px-2.5 py-2',
      attendu: 'rounded-md border border-border/50 bg-muted/15 px-2.5 py-2',
    },
    label: {
      cible: 'text-muted-foreground',
      cumul: 'text-muted-foreground',
      attendu: 'text-muted-foreground',
    },
  },
  COMPORTEMENTAL: {
    card: 'border border-border/60 bg-card',
    header: 'border-b border-border/50 bg-muted/20',
    icon: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    badge: 'bg-muted text-muted-foreground border-border/60',
    saisie: 'rounded-lg border border-border/60 bg-muted/10 p-3',
    taux: 'rounded-lg border border-border/50 bg-muted/15 p-2',
    preview: 'rounded-md border border-border/50 bg-muted/10 px-2 py-1.5 text-xs',
    blocks: {
      cible: 'rounded-md border border-border/50 bg-muted/15 px-2.5 py-2',
      cumul: 'rounded-md border border-border/50 bg-muted/15 px-2.5 py-2',
      attendu: 'rounded-md border border-border/50 bg-muted/15 px-2.5 py-2',
    },
    label: {
      cible: 'text-muted-foreground',
      cumul: 'text-muted-foreground',
      attendu: 'text-muted-foreground',
    },
  },
}

function getKpiTheme(type: string) {
  return KPI_TYPE_THEME[type as KpiTypeKey] ?? KPI_TYPE_THEME.QUANTITATIF
}

function KpiTypeBadge({ type }: { type: string }) {
  const theme = getKpiTheme(type)
  if (type === 'QUANTITATIF')
    return (
      <Badge variant="secondary" className={`gap-1 font-normal border ${theme.badge}`}>
        <BarChart3 className="h-3 w-3" />
        Quantitatif
      </Badge>
    )
  if (type === 'QUALITATIF')
    return (
      <Badge variant="secondary" className={`gap-1 font-normal border ${theme.badge}`}>
        <Star className="h-3 w-3" />
        Qualitatif
      </Badge>
    )
  return (
    <Badge variant="secondary" className={`gap-1 font-normal border ${theme.badge}`}>
      <TrendingUp className="h-3 w-3" />
      Comportemental
    </Badge>
  )
}

const STATUT_PERIODE: Record<string, { label: string; className: string }> = {
  OUVERTE: { label: 'Ouverte', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  EN_RETARD: { label: 'En retard', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  VERROUILLEE: { label: 'Clôturée', className: 'bg-muted text-muted-foreground' },
}

const STATUT_SAISIE: Record<string, { label: string; className: string }> = {
  OUVERTE: { label: 'Ouverte', className: 'bg-muted text-muted-foreground border-border/60' },
  EN_RETARD: { label: 'En retard', className: 'bg-muted text-muted-foreground border-border/60' },
  SOUMISE: { label: 'Soumise', className: 'bg-muted text-muted-foreground border-border/60' },
  VALIDEE: { label: 'Validée', className: 'bg-green-500/8 text-green-700 dark:text-green-400 border-border/60' },
  REJETEE: { label: 'Rejetée', className: 'bg-red-500/8 text-red-700 dark:text-red-400 border-border/60' },
  AJUSTEE: { label: 'Ajustée', className: 'bg-green-500/8 text-green-700 dark:text-green-400 border-border/60' },
}

function KpiCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-muted animate-pulse" />
      <CardHeader className="space-y-3">
        <div className="h-5 w-2/3 bg-muted rounded animate-pulse" />
        <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-16 bg-muted/50 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="h-10 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}

type KpiEmployeItem = {
  id: number
  cible: number
  poids?: number
  catalogueKpi: { id: number; nom: string; type: string; unite: string | null; sens_calcul?: string | null }
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
  const { getNotation } = useNotationGrille()
  const searchParams = useSearchParams()
  const focusKpiIdParam = searchParams.get('kpiEmployeId')
  const focusKpiId =
    focusKpiIdParam != null && !Number.isNaN(parseInt(focusKpiIdParam, 10))
      ? parseInt(focusKpiIdParam, 10)
      : null
  const now = new Date()
  const [mois, setMois] = useState(now.getMonth() + 1)
  const [annee, setAnnee] = useState(now.getFullYear())
  const [kpiEmployes, setKpiEmployes] = useState<KpiEmployeItem[]>([])
  const [saisies, setSaisies] = useState<SaisieItem[]>([])
  const [statutPeriode, setStatutPeriode] = useState<string>('OUVERTE')
  const [periodesOuvertesParN1, setPeriodesOuvertesParN1] = useState<{ mois: number; annee: number }[]>([])
  const [delaiJour, setDelaiJour] = useState(10)
  const [periode, setPeriode] = useState<{ code: string } | null>(null)
  const [dernierePeriode, setDernierePeriode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<FormValues>({})
  const [mounted, setMounted] = useState(false)
  const [uploadingPreuves, setUploadingPreuves] = useState<Record<number, boolean>>({})

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
    setPeriodesOuvertesParN1(data.periodesOuvertesParN1 ?? [])
    setDelaiJour(data.delaiJour ?? 10)
    setPeriode(data.periode ?? null)
    setDernierePeriode(data.dernierePeriode ?? null)
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

  const sortedKpiEmployes = useMemo(() => {
    if (focusKpiId == null) return kpiEmployes
    const focused = kpiEmployes.find((k) => k.id === focusKpiId)
    if (!focused) return kpiEmployes
    return [focused, ...kpiEmployes.filter((k) => k.id !== focusKpiId)]
  }, [kpiEmployes, focusKpiId])

  useEffect(() => {
    if (!loading && focusKpiId != null) {
      const timer = setTimeout(() => {
        document.getElementById(`kpi-saisie-${focusKpiId}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [loading, focusKpiId, sortedKpiEmployes.length])

  const periodeOuverteParN1 = periodesOuvertesParN1.some((p) => p.mois === mois && p.annee === annee)
  const saisieModifiable = statutPeriode !== 'VERROUILLEE' || periodeOuverteParN1

  const canChangeMonth = (m: number, a: number) => {
    const statut = getStatutSaisie(m, a, delaiJour)
    const ouverteParN1 = periodesOuvertesParN1.some((p) => p.mois === m && p.annee === a)
    return statut !== 'VERROUILLEE' || ouverteParN1
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

  const handleUploadPreuve = async (kpiEmployeId: number, file: File | null) => {
    if (!file) return
    setUploadingPreuves((prev) => ({ ...prev, [kpiEmployeId]: true }))
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/saisies/preuves', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          title: 'Erreur',
          description: data?.error ?? 'Échec de l’envoi du fichier',
          variant: 'destructive',
        })
        return
      }
      setFormKpi(kpiEmployeId, 'preuves', data.url as string)
      toast({ title: 'Fichier joint', description: data.filename ?? file.name })
    } finally {
      setUploadingPreuves((prev) => ({ ...prev, [kpiEmployeId]: false }))
    }
  }

  const getValeurNum = (kpiEmployeId: number): number | null => {
    const v = form[kpiEmployeId]?.valeur?.trim?.()
    if (v == null || v === '') return null
    const n = parseFloat(v.replace(',', '.'))
    return Number.isNaN(n) ? null : n
  }

  const isCardReadOnly = (kpiEmployeId: number) => {
    if (!saisieModifiable) return true
    const s = saisies.find((x) => x.kpiEmployeId === kpiEmployeId)
    return s ? !isSaisieModifiable(s.statut) : false
  }

  // Ne considérer que les KPI modifiables pour la soumission
  const kpiToSubmit = kpiEmployes.filter((k) => !isCardReadOnly(k.id))
  const missingFields = kpiToSubmit
    .map((k) => {
      const val = getValeurNum(k.id)
      if (val == null) return { nom: k.catalogueKpi.nom, champ: 'valeur' }
      if (k.catalogueKpi.type === 'QUALITATIF' && !(form[k.id]?.commentaire?.trim())) return { nom: k.catalogueKpi.nom, champ: 'Source de la note (obligatoire)' }
      if (k.catalogueKpi.type === 'COMPORTEMENTAL' && !(form[k.id]?.preuves?.trim())) return { nom: k.catalogueKpi.nom, champ: 'Fichier de preuve (obligatoire)' }
      return null
    })
    .filter((x): x is { nom: string; champ: string } => x != null)
  const allFilled = kpiToSubmit.length > 0 && missingFields.length === 0

  const handleSaveDraft = async () => {
    if (!saisieModifiable) return
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
    if (!allFilled || !saisieModifiable) return
    setSubmitting(true)
    const ids: number[] = []
    for (const k of kpiToSubmit) {
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

  const periodeStatut = STATUT_PERIODE[statutPeriode] ?? { label: statutPeriode, className: '' }
  const editableCount = kpiToSubmit.length

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <PenLine className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Saisie des réalisations</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
              <Calendar className="h-3.5 w-3.5" />
              {MOIS_LABELS[mois]} {annee}
              {periode && <span className="text-muted-foreground/60">· {periode.code}</span>}
            </p>
          </div>
        </div>
        {saisieModifiable && kpiEmployes.length > 0 && !loading && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={saving || submitting}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={!allFilled || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Soumettre
            </Button>
          </div>
        )}
      </div>

      <Card className="shadow-sm border-border/60">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Mois de saisie</Label>
              {!mounted ? (
                <div className="h-10 w-full sm:w-[220px] rounded-md border border-input bg-muted/30 px-3 flex items-center text-sm">
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
                  <SelectTrigger className="w-full sm:w-[220px]">
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
            <div className="flex flex-wrap gap-2 items-center">
              {periode && (
                <Badge variant="outline" className="font-normal">
                  {periode.code}
                </Badge>
              )}
              <Badge variant="outline" className={cn('font-normal', periodeStatut.className)}>
                Période {periodeStatut.label.toLowerCase()}
              </Badge>
              {!loading && kpiEmployes.length > 0 && (
                <Badge variant="secondary" className="font-normal">
                  {editableCount} KPI modifiable{editableCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {statutPeriode === 'EN_RETARD' && !periodeOuverteParN1 && (
        <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <AlertDescription className="flex items-center gap-2">
            Votre saisie est en retard, votre manager est informé. Vous pouvez encore saisir et soumettre ci-dessous.
          </AlertDescription>
        </Alert>
      )}
      {statutPeriode === 'VERROUILLEE' && periodeOuverteParN1 && (
        <Alert variant="default" className="border-emerald-500/50 bg-emerald-500/10">
          <PenLine className="h-4 w-4 shrink-0" />
          <AlertDescription>
            Votre N+1 a ouvert cette période (saisie dépassée). Vous pouvez saisir et soumettre ci-dessous.
          </AlertDescription>
        </Alert>
      )}
      {statutPeriode === 'VERROUILLEE' && !periodeOuverteParN1 && (
        <Alert variant="destructive" className="border-red-500/50">
          <Lock className="h-4 w-4 shrink-0" />
          <AlertDescription>
            La période de saisie est clôturée, contactez votre manager.
          </AlertDescription>
        </Alert>
      )}

      <GrilleReference
        variant="officielle"
        collapsible
        defaultOpen={false}
        description="Grille paramétrée par l'administration — seuils, appréciations et commentaires appliqués à vos saisies"
      />

      {loading ? (
        <div className="space-y-4">
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>
      ) : periode == null ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 px-6 text-center">
          <CalendarX className="h-16 w-16 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            Aucune période active ce mois
          </h3>
          <p className="text-muted-foreground max-w-md">
            Il n&apos;y a pas de période d&apos;évaluation active pour{' '}
            <strong>{MOIS_LABELS[mois]} {annee}</strong>. Contactez votre administrateur RH.
          </p>
          {dernierePeriode && (
            <p className="text-xs text-muted-foreground">
              Dernière période connue : {dernierePeriode}
            </p>
          )}
        </div>
      ) : kpiEmployes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 px-6 text-center">
          <ClipboardX className="h-16 w-16 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">
            Aucun KPI assigné pour cette période
          </h3>
          <p className="text-muted-foreground max-w-md">
            Période active : <strong>{periode.code}</strong>
            <br />
            Votre manager n&apos;a pas encore assigné de KPI pour cette période.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {focusKpiId != null && sortedKpiEmployes.some((k) => k.id === focusKpiId) && (
            <p className="text-xs text-muted-foreground">
              KPI sélectionné mis en avant.
            </p>
          )}
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Indicateurs ({kpiEmployes.length})
          </h2>
          {sortedKpiEmployes.map((k) => {
            const type = k.catalogueKpi.type as TypeKpi
            const sensCalcul = (k.catalogueKpi.sens_calcul ?? 'DIRECT') as SensCalculKpi
            const unite = k.catalogueKpi.unite ?? ''
            const cibleCeMois = k.saisie_mois_courant?.cible_ce_mois ?? k.cible_mensuelle ?? k.cible
            const valNum = getValeurNum(k.id)
            const peutCalculer = valNum != null && (cibleCeMois > 0 || sensCalcul === 'ZERO_DEFAUT')
            const taux = peutCalculer
              ? calculerTauxAtteinte(valNum!, cibleCeMois, type, sensCalcul)
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
            const theme = getKpiTheme(type)
            const notation = peutCalculer && taux > 0 ? getNotation(taux) : null
            const statutSaisieBadge = saisie?.statut
              ? STATUT_SAISIE[saisie.statut]
              : null
            const isFocused = focusKpiId === k.id

            return (
              <Card
                key={k.id}
                id={`kpi-saisie-${k.id}`}
                className={cn(
                  'overflow-hidden shadow-sm transition-shadow hover:shadow-md',
                  theme.card,
                  readOnly && 'opacity-80',
                  isFocused && 'ring-1 ring-primary/25 shadow-md'
                )}
              >
                <CardHeader className={cn('py-2 px-3', theme.header)}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', theme.icon)}>
                        {type === 'QUANTITATIF' && <BarChart3 className="h-4 w-4" />}
                        {type === 'QUALITATIF' && <Star className="h-4 w-4" />}
                        {type === 'COMPORTEMENTAL' && <TrendingUp className="h-4 w-4" />}
                      </div>
                      <div>
                        <CardTitle className="text-base leading-snug">
                          {k.catalogueKpi.nom}
                          {unite && <span className="text-muted-foreground font-normal text-sm"> ({unite})</span>}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-0.5 text-xs">
                          <Target className="h-3.5 w-3.5" />
                          Cible du mois : {cibleCeMois != null ? `${Number(cibleCeMois).toFixed(1)}${unite ? ` ${unite}` : ''}` : '—'}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <KpiTypeBadge type={type} />
                      {k.poids != null && k.poids > 0 && (
                        <Badge variant="outline" className="font-normal">
                          Poids {k.poids}%
                        </Badge>
                      )}
                      {statutSaisieBadge && (
                        <Badge variant="outline" className={cn('text-xs', statutSaisieBadge.className)}>
                          {statutSaisieBadge.label}
                        </Badge>
                      )}
                      {readOnly && (
                        <span className="text-[10px] text-muted-foreground">Lecture seule</span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 px-3 pb-3">
                  {(cibleCeMois != null || k.cible_mensuelle != null || k.realise_cumule != null || k.cible_attendue_a_date != null) && (
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className={theme.blocks.cible}>
                        <p className={cn('text-[10px] uppercase tracking-wide font-medium', theme.label.cible)}>Cible mois</p>
                        <p className="text-sm font-semibold tabular-nums leading-tight mt-0.5">
                          {cibleCeMois != null
                            ? `${Number(cibleCeMois).toFixed(1)}${unite ? ` ${unite}` : ''}`
                            : '—'}
                        </p>
                      </div>
                      <div className={theme.blocks.cumul}>
                        <p className={cn('text-[10px] uppercase tracking-wide font-medium', theme.label.cumul)}>
                          {libellerRealisePeriode((k.mode_agregation ?? 'MOYENNE') as ModeAgregation)}
                        </p>
                        <p className="text-sm font-semibold tabular-nums leading-tight mt-0.5">
                          {k.realise_cumule != null ? `${Number(k.realise_cumule).toFixed(1)}${unite ? ` ${unite}` : ''}` : '—'}
                        </p>
                      </div>
                      <div className={theme.blocks.attendu}>
                        <p className={cn('text-[10px] uppercase tracking-wide font-medium', theme.label.attendu)}>Attendu</p>
                        <p className="text-sm font-semibold tabular-nums leading-tight mt-0.5">
                          {k.cible_attendue_a_date != null ? `${Number(k.cible_attendue_a_date).toFixed(1)}${unite ? ` ${unite}` : ''}` : '—'}
                        </p>
                      </div>
                    </div>
                  )}

                  {(k.cible_periode != null ||
                    (k.historique != null && k.historique.length > 0) ||
                    ((type === 'QUANTITATIF' || type === 'QUALITATIF') && peutCalculer && notation)) && (
                    <div className={cn('space-y-2', theme.taux)}>
                      {(k.cible_periode != null || (k.historique != null && k.historique.length > 0)) && (
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                          {k.cible_periode != null && k.periode_code != null && (
                            <p className="text-[10px] text-muted-foreground">
                              Cible {k.periode_code}
                              {k.periode_nb_mois != null && ` (${k.periode_nb_mois} mois)`} :{' '}
                              <span className="font-medium text-foreground tabular-nums">
                                {typeof k.cible_periode === 'number' ? k.cible_periode.toFixed(1) : k.cible_periode}
                                {unite ? ` ${unite}` : ''}
                              </span>
                            </p>
                          )}
                          {k.historique != null && k.historique.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              {k.historique.map((h) => {
                                const isCurrent = h.mois === mois
                                const label = MOIS_LABELS[h.mois]?.slice(0, 3) ?? String(h.mois)
                                const val =
                                  h.valeur != null
                                    ? typeof h.valeur === 'number'
                                      ? h.valeur.toFixed(1)
                                      : String(h.valeur)
                                    : '—'
                                return (
                                  <span
                                    key={h.mois}
                                    className={cn(
                                      'rounded px-1.5 py-0.5 text-[10px] tabular-nums',
                                      isCurrent
                                        ? 'bg-primary/10 text-primary font-semibold ring-1 ring-primary/20'
                                        : 'bg-background/80 text-muted-foreground'
                                    )}
                                  >
                                    {label}:{val}
                                  </span>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {(() => {
                        const showPeriode = k.taux_avancement_periode != null
                        const showMois =
                          (type === 'QUANTITATIF' || type === 'QUALITATIF') && peutCalculer && notation
                        const notationPeriode =
                          showPeriode && k.taux_avancement_periode != null
                            ? getNotation(k.taux_avancement_periode)
                            : null

                        const renderMetrique = (
                          label: string,
                          valeur: number,
                          notationMetrique: NonNullable<typeof notation>,
                          pied?: string
                        ) => (
                          <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex h-4 items-center justify-between gap-2">
                              <span className="text-[10px] leading-none text-muted-foreground">{label}</span>
                              <span
                                className="text-xs font-semibold tabular-nums leading-none"
                                style={{ color: notationMetrique.chartColor }}
                              >
                                {valeur.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, valeur)}%`,
                                  backgroundColor: notationMetrique.chartColor,
                                }}
                              />
                            </div>
                            <p className="min-h-[14px] text-[10px] leading-tight text-muted-foreground line-clamp-1">
                              {pied || '\u00A0'}
                            </p>
                          </div>
                        )

                        if (showPeriode && showMois && notation && notationPeriode) {
                          return (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-0">
                              {renderMetrique(
                                'Progression période',
                                Number(k.taux_avancement_periode),
                                notationPeriode,
                                notationPeriode.commentaire || notationPeriode.appreciation
                              )}
                              {renderMetrique(
                                'Taux mois',
                                taux,
                                notation,
                                notation.appreciation
                              )}
                            </div>
                          )
                        }

                        return (
                          <div className="grid grid-cols-1 gap-2">
                            {showPeriode &&
                              notationPeriode &&
                              renderMetrique(
                                'Progression période',
                                Number(k.taux_avancement_periode),
                                notationPeriode,
                                notationPeriode.commentaire || notationPeriode.appreciation
                              )}
                            {showMois &&
                              notation &&
                              renderMetrique('Taux mois', taux, notation, notation.appreciation)}
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  <div className={theme.saisie}>
                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-muted-foreground">
                      <PenLine className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      Saisie — {MOIS_LABELS[mois]} {annee}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="space-y-1 min-w-0">
                        {type === 'QUANTITATIF' && (
                          <>
                            <Label className="flex items-center gap-1.5 text-xs font-medium">
                              <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              Valeur réalisée
                            </Label>
                            <Input
                              type="number"
                              step="any"
                              value={form[k.id]?.valeur ?? ''}
                              onChange={(e) => setFormKpi(k.id, 'valeur', e.target.value)}
                              disabled={readOnly}
                              placeholder="0"
                              className="h-9 w-full"
                            />
                          </>
                        )}
                        {type === 'QUALITATIF' && (
                          <>
                            <Label className="flex items-center gap-1.5 text-xs font-medium">
                              <Star className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              Note réalisée
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
                              className="h-9 w-full"
                            />
                          </>
                        )}
                        {type === 'COMPORTEMENTAL' && (
                          <>
                            <Label className="flex items-center gap-1.5 text-xs font-medium">
                              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              Niveau
                            </Label>
                            <Select
                              value={form[k.id]?.valeur ?? ''}
                              onValueChange={(v) => setFormKpi(k.id, 'valeur', v)}
                              disabled={readOnly}
                            >
                              <SelectTrigger className="h-9 w-full">
                                <SelectValue placeholder="Choisir le niveau" />
                              </SelectTrigger>
                              <SelectContent>
                                {NIVEAUX_COMPORTEMENTAL.map((n) => (
                                  <SelectItem key={n.value} value={String(n.value)}>
                                    {n.value} — {n.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </>
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="flex items-center gap-1.5 text-xs font-medium">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {type === 'QUALITATIF'
                            ? 'Source de la note'
                            : type === 'COMPORTEMENTAL'
                              ? 'Commentaire (optionnel)'
                              : 'Commentaire (optionnel)'}
                          {type === 'QUALITATIF' && (
                            <span className="text-destructive text-xs font-normal">*</span>
                          )}
                        </Label>
                        <Textarea
                          value={form[k.id]?.commentaire ?? ''}
                          onChange={(e) => setFormKpi(k.id, 'commentaire', e.target.value)}
                          disabled={readOnly}
                          placeholder={
                            type === 'QUALITATIF'
                              ? 'Source de la note'
                              : 'Commentaire'
                          }
                          rows={2}
                          className="min-h-[36px] text-sm resize-none"
                        />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <Label className="flex items-center gap-1.5 text-xs font-medium">
                          <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {type === 'COMPORTEMENTAL' ? 'Preuves' : 'Preuves (optionnel)'}
                          {type === 'COMPORTEMENTAL' && (
                            <span className="text-destructive text-xs font-normal">*</span>
                          )}
                        </Label>
                        {(() => {
                          const preuveVal = form[k.id]?.preuves?.trim() ?? ''
                          const uploading = Boolean(uploadingPreuves[k.id])
                          const hasFile = preuveVal && isPreuveFichier(preuveVal)
                          const hasLegacyText = preuveVal && !isPreuveFichier(preuveVal)

                          if (readOnly) {
                            if (!preuveVal) {
                              return (
                                <p className="text-xs text-muted-foreground py-2">Aucune preuve jointe</p>
                              )
                            }
                            if (hasFile) {
                              return (
                                <a
                                  href={preuveVal}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors min-w-0"
                                >
                                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                                    <FileText className="h-4 w-4" />
                                  </span>
                                  <span className="truncate min-w-0 flex-1 font-medium text-foreground">
                                    {nomFichierPreuve(preuveVal)}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground shrink-0">Ouvrir</span>
                                </a>
                              )
                            }
                            return (
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                                {preuveVal}
                              </p>
                            )
                          }

                          return (
                            <div className="space-y-1.5">
                              {hasLegacyText && (
                                <p className="text-xs text-muted-foreground break-words rounded-md border border-dashed px-2 py-1.5">
                                  Ancienne référence : {preuveVal}
                                </p>
                              )}
                              {hasFile ? (
                                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 min-w-0">
                                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shrink-0">
                                    <FileText className="h-4 w-4" />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <a
                                      href={preuveVal}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block truncate text-sm font-medium text-foreground hover:underline"
                                    >
                                      {nomFichierPreuve(preuveVal)}
                                    </a>
                                    <p className="text-[11px] text-muted-foreground">Fichier joint — cliquer pour ouvrir</p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => setFormKpi(k.id, 'preuves', '')}
                                    aria-label="Retirer le fichier"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <label
                                  className={cn(
                                    'relative flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-4 text-center transition-colors cursor-pointer',
                                    uploading
                                      ? 'border-primary/40 bg-primary/5 pointer-events-none'
                                      : 'border-border/70 bg-muted/10 hover:border-primary/50 hover:bg-muted/25'
                                  )}
                                  onDragOver={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (uploading) return
                                    const file = e.dataTransfer.files?.[0] ?? null
                                    void handleUploadPreuve(k.id, file)
                                  }}
                                >
                                  <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv"
                                    disabled={uploading}
                                    className="sr-only"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] ?? null
                                      e.target.value = ''
                                      void handleUploadPreuve(k.id, file)
                                    }}
                                  />
                                  {uploading ? (
                                    <>
                                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                      <span className="text-xs font-medium text-foreground">Envoi en cours…</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <Upload className="h-4 w-4" />
                                      </span>
                                      <span className="text-xs font-medium text-foreground">
                                        Glisser un fichier ou{' '}
                                        <span className="text-primary underline-offset-2 hover:underline">
                                          parcourir
                                        </span>
                                      </span>
                                      <span className="text-[10px] text-muted-foreground leading-tight">
                                        PDF, image, Word, Excel — max. 5 Mo
                                      </span>
                                    </>
                                  )}
                                </label>
                              )}
                              {hasFile && (
                                <label className="inline-flex cursor-pointer text-[11px] text-primary hover:underline">
                                  <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv"
                                    disabled={uploading}
                                    className="sr-only"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0] ?? null
                                      e.target.value = ''
                                      void handleUploadPreuve(k.id, file)
                                    }}
                                  />
                                  Remplacer le fichier
                                </label>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </div>

                  {(type === 'QUANTITATIF' || type === 'QUALITATIF') && valNum != null && cibleCeMois > 0 && (
                    <div className={cn(theme.preview)}>
                      <p className="font-medium leading-snug">
                        Si je saisis {typeof valNum === 'number' ? valNum.toFixed(1) : valNum} → {taux.toFixed(1)}% de la cible mensuelle
                      </p>
                      {k.mode_agregation === 'CUMUL' && cumulSiSaisi != null && k.cible_periode != null && (
                        <p className="text-muted-foreground mt-0.5">
                          Cumul serait : {typeof cumulSiSaisi === 'number' ? cumulSiSaisi.toFixed(1) : cumulSiSaisi} / {typeof k.cible_periode === 'number' ? k.cible_periode.toFixed(1) : k.cible_periode} = {pctPeriodeSiSaisi != null ? pctPeriodeSiSaisi.toFixed(1) : '—'}% de la période
                        </p>
                      )}
                    </div>
                  )}

                  {saisie && ['SOUMISE', 'VALIDEE', 'AJUSTEE', 'REJETEE'].includes(saisie.statut) && (
                    <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1 text-[11px]">
                      {saisie.statut === 'VALIDEE' && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                      {saisie.statut === 'AJUSTEE' && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                      {saisie.statut === 'SOUMISE' && <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600 shrink-0" />}
                      {saisie.statut === 'REJETEE' && <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                      <span className="text-muted-foreground">
                        Statut : {saisie.statut === 'VALIDEE' && 'Validée'}
                        {saisie.statut === 'AJUSTEE' && 'Ajustée'}
                        {saisie.statut === 'SOUMISE' && 'En attente de validation'}
                        {saisie.statut === 'REJETEE' && 'Rejetée'}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {!loading && kpiEmployes.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={!saisieModifiable || saving || submitting}
            className="gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer brouillon
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!allFilled || !saisieModifiable || submitting}
            className="gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Soumettre pour validation
          </Button>
          {!allFilled && kpiEmployes.length > 0 && (
            <div className="text-muted-foreground text-sm ml-auto space-y-0.5">
              <span className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 shrink-0" />
                {kpiToSubmit.length === 0 ? (
                  'Toutes les saisies sont déjà soumises ou validées'
                ) : missingFields.length > 0 ? (
                  <>
                    Champs manquants :{' '}
                    {missingFields.map((m, i) => (
                      <span key={i} className="font-medium text-foreground">
                        {m.nom} ({m.champ})
                        {i < missingFields.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </>
                ) : (
                  'Remplissez tous les champs pour pouvoir soumettre'
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
