'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
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
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NotationBadge } from '@/components/notation/NotationBadge'
import { GrilleReference } from '@/components/notation/GrilleReference'
import { useNotationGrille } from '@/contexts/notation-grille-context'
import {
  calculerTauxAtteinte,
  getStatutSaisie,
  type SensCalculKpi,
  type TypeKpi,
} from '@/lib/saisie-utils'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Calendar,
  ClipboardList,
  ClipboardX,
  Loader2,
  Lock,
  MessageSquare,
  Save,
  Send,
  Target,
} from 'lucide-react'

const MOIS_LABELS: Record<number, string> = {
  1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril', 5: 'Mai', 6: 'Juin',
  7: 'Juillet', 8: 'Août', 9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre',
}

type KpiDirectionItem = {
  id: number
  cible: number
  poids: number
  catalogueKpi: {
    id: number
    code: string | null
    nom: string
    type: string
    unite: string | null
    frequence: string | null
    categorie: string | null
    sens_calcul?: string | null
  }
  saisie_mois_courant: {
    id: number | null
    valeur_prevue: number | null
    valeur: number | null
    statut: string
    commentaire: string | null
    taux: number | null
  }
}

type FormRow = {
  prevu: string
  realise: string
  commentaire: string
}

const STATUT_SAISIE: Record<string, { label: string; className: string }> = {
  OUVERTE: { label: 'Ouverte', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200' },
  EN_RETARD: { label: 'En retard', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200' },
  SOUMISE: { label: 'Soumise', className: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200' },
  VALIDEE: { label: 'Validée', className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200' },
  REJETEE: { label: 'Rejetée', className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200' },
  AJUSTEE: { label: 'Ajustée', className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200' },
}

const STATUT_PERIODE: Record<string, { label: string; className: string }> = {
  OUVERTE: { label: 'Ouverte', className: 'bg-green-500/10 text-green-700 dark:text-green-400' },
  EN_RETARD: { label: 'En retard', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400' },
  VERROUILLEE: { label: 'Clôturée', className: 'bg-muted text-muted-foreground' },
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

export default function DirecteurSaisiePage() {
  const { getNotation } = useNotationGrille()
  const now = new Date()
  const [mois, setMois] = useState(now.getMonth() + 1)
  const [annee, setAnnee] = useState(now.getFullYear())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [kpiDirections, setKpiDirections] = useState<KpiDirectionItem[]>([])
  const [statutPeriode, setStatutPeriode] = useState('OUVERTE')
  const [delaiJour, setDelaiJour] = useState(10)
  const [periode, setPeriode] = useState<{ code: string } | null>(null)
  const [form, setForm] = useState<Record<number, FormRow>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/saisies-direction?mois=${mois}&annee=${annee}`)
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data?.error ?? 'Erreur de chargement')
      return
    }
    const data = await res.json()
    const list = data.kpiDirections ?? []
    setKpiDirections(list)
    setStatutPeriode(data.statutPeriode ?? 'OUVERTE')
    setDelaiJour(data.delaiJour ?? 10)
    setPeriode(data.periode ?? null)
    const next: Record<number, FormRow> = {}
    for (const k of list) {
      const s = k.saisie_mois_courant
      next[k.id] = {
        prevu: s.valeur_prevue != null ? String(s.valeur_prevue) : '',
        realise: s.valeur != null ? String(s.valeur) : '',
        commentaire: s.commentaire ?? '',
      }
    }
    setForm(next)
  }, [mois, annee])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const saisieModifiable = statutPeriode !== 'VERROUILLEE'

  const isReadOnly = (k: KpiDirectionItem) => {
    if (!saisieModifiable) return true
    return ['SOUMISE', 'VALIDEE', 'AJUSTEE'].includes(k.saisie_mois_courant.statut)
  }

  const setField = (id: number, field: keyof FormRow, value: string) => {
    setForm((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { prevu: '', realise: '', commentaire: '' }), [field]: value },
    }))
  }

  const parseNum = (s: string): number | null => {
    const v = s.trim().replace(',', '.')
    if (!v) return null
    const n = parseFloat(v)
    return Number.isNaN(n) ? null : n
  }

  const computeTaux = (k: KpiDirectionItem, realise: string | null | undefined): number | null => {
    const val = realise != null ? parseNum(realise) : null
    if (val == null) return k.saisie_mois_courant.taux
    const type = k.catalogueKpi.type as TypeKpi
    const sens = (k.catalogueKpi.sens_calcul ?? 'DIRECT') as SensCalculKpi
    return Math.round(calculerTauxAtteinte(val, k.cible, type, sens) * 10) / 10
  }

  const handleSave = async () => {
    if (!saisieModifiable) return
    setSaving(true)
    const editable = kpiDirections.filter((k) => !isReadOnly(k))
    const results = await Promise.all(
      editable.map((k) =>
        fetch('/api/saisies-direction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kpiDirectionId: k.id,
            mois,
            annee,
            valeur_prevue: parseNum(form[k.id]?.prevu ?? ''),
            valeur_realisee: parseNum(form[k.id]?.realise ?? ''),
            commentaire: form[k.id]?.commentaire?.trim() || null,
          }),
        })
      )
    )
    setSaving(false)
    if (results.some((r) => !r.ok)) {
      toast.error("Erreur lors de l'enregistrement")
      return
    }
    toast.success('Brouillon enregistré')
    fetchData()
  }

  const handleSubmitAll = async () => {
    if (!saisieModifiable) return
    const editable = kpiDirections.filter((k) => !isReadOnly(k))
    const missing = editable.filter((k) => parseNum(form[k.id]?.realise ?? '') == null)
    if (missing.length > 0) {
      toast.error('Renseignez la valeur réalisée pour tous les KPI')
      return
    }
    setSubmitting(true)
    for (const k of editable) {
      const resSave = await fetch('/api/saisies-direction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kpiDirectionId: k.id,
          mois,
          annee,
          valeur_prevue: parseNum(form[k.id]?.prevu ?? ''),
          valeur_realisee: parseNum(form[k.id]?.realise ?? ''),
          commentaire: form[k.id]?.commentaire?.trim() || null,
        }),
      })
      if (!resSave.ok) {
        setSubmitting(false)
        toast.error('Erreur lors de la soumission')
        return
      }
      const saved = await resSave.json()
      const saisieId = saved?.id ?? k.saisie_mois_courant.id
      if (saisieId) {
        const resSubmit = await fetch(`/api/saisies-direction/${saisieId}/soumettre`, { method: 'POST' })
        if (!resSubmit.ok) {
          setSubmitting(false)
          toast.error('Erreur lors de la soumission')
          return
        }
      }
    }
    setSubmitting(false)
    toast.success('Saisies soumises pour validation')
    fetchData()
  }

  const moisOptions: { mois: number; annee: number; label: string }[] = []
  let m = now.getMonth() + 1
  let a = now.getFullYear()
  for (let i = 0; i < 12; i++) {
    if (getStatutSaisie(m, a, delaiJour) !== 'VERROUILLEE') {
      moisOptions.push({ mois: m, annee: a, label: `${MOIS_LABELS[m]} ${a}` })
    }
    m--
    if (m < 1) { m = 12; a-- }
  }

  const periodeStatut = STATUT_PERIODE[statutPeriode] ?? { label: statutPeriode, className: '' }
  const editableCount = kpiDirections.filter((k) => !isReadOnly(k)).length

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Saisie KPI direction</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
              <Calendar className="h-3.5 w-3.5" />
              {MOIS_LABELS[mois]} {annee}
              {periode && <span className="text-muted-foreground/60">· {periode.code}</span>}
            </p>
          </div>
        </div>
        {saisieModifiable && kpiDirections.length > 0 && !loading && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || submitting}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
            <Button size="sm" onClick={handleSubmitAll} disabled={saving || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Soumettre
            </Button>
          </div>
        )}
      </div>

      {/* Alertes période */}
      {statutPeriode === 'EN_RETARD' && (
        <Alert className="border-amber-500/40 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            La saisie est en retard. Vous pouvez encore enregistrer et soumettre vos indicateurs.
          </AlertDescription>
        </Alert>
      )}
      {statutPeriode === 'VERROUILLEE' && (
        <Alert variant="destructive" className="border-red-500/40">
          <Lock className="h-4 w-4" />
          <AlertDescription>La période de saisie est clôturée pour ce mois.</AlertDescription>
        </Alert>
      )}

      {/* Barre période */}
      <Card className="shadow-sm">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Mois de saisie</Label>
              <Select
                value={`${mois}-${annee}`}
                onValueChange={(v) => {
                  const [mm, aa] = v.split('-').map(Number)
                  setMois(mm)
                  setAnnee(aa)
                }}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {moisOptions.map((o) => (
                    <SelectItem key={`${o.mois}-${o.annee}`} value={`${o.mois}-${o.annee}`}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {!loading && kpiDirections.length > 0 && (
                <Badge variant="secondary" className="font-normal">
                  {editableCount} KPI modifiable{editableCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grille repliable */}
      <GrilleReference
        variant="officielle"
        collapsible
        defaultOpen={false}
        description="Grille paramétrée par l'administration — seuils, appréciations et commentaires appliqués à vos saisies"
      />

      {/* Liste KPI */}
      {loading ? (
        <div className="space-y-4">
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>
      ) : kpiDirections.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 px-6 text-center">
          <ClipboardX className="h-14 w-14 text-muted-foreground/50" />
          <div>
            <h3 className="font-semibold text-lg">Aucun KPI à saisir</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm">
              Aucun indicateur direction n&apos;est saisissable pour {MOIS_LABELS[mois]} {annee}.
              Vérifiez la fréquence des indicateurs ou la période active.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Indicateurs ({kpiDirections.length})
            </h2>
          </div>

          {kpiDirections.map((k) => {
            const readOnly = isReadOnly(k)
            const realiseForm = form[k.id]?.realise ?? ''
            const taux = computeTaux(k, realiseForm)
            const notation = taux != null ? getNotation(taux) : null
            const statutSaisie = STATUT_SAISIE[k.saisie_mois_courant.statut] ?? {
              label: k.saisie_mois_courant.statut,
              className: 'bg-muted text-muted-foreground',
            }
            const unite = k.catalogueKpi.unite

            return (
              <Card
                key={k.id}
                className={cn(
                  'overflow-hidden shadow-sm transition-shadow hover:shadow-md',
                  readOnly && 'opacity-80'
                )}
              >
                {notation && (
                  <div className="h-1" style={{ backgroundColor: notation.chartColor }} />
                )}
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2 min-w-0 flex-1">
                      <CardTitle className="text-base leading-snug flex items-start gap-2">
                        <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{k.catalogueKpi.nom}</span>
                      </CardTitle>
                      <div className="flex flex-wrap gap-1.5">
                        {k.catalogueKpi.code && (
                          <Badge variant="outline" className="text-xs font-normal">
                            {k.catalogueKpi.code}
                          </Badge>
                        )}
                        {k.catalogueKpi.categorie && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            {k.catalogueKpi.categorie}
                          </Badge>
                        )}
                        {k.catalogueKpi.frequence && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            {k.catalogueKpi.frequence}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex flex-wrap gap-x-3 gap-y-0 text-xs">
                        <span>
                          Cible : <strong>{k.cible}{unite ? ` ${unite}` : '%'}</strong>
                        </span>
                        <span>Poids : <strong>{k.poids}%</strong></span>
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant="outline" className={cn('text-xs', statutSaisie.className)}>
                        {statutSaisie.label}
                      </Badge>
                      {readOnly && (
                        <span className="text-[10px] text-muted-foreground">Lecture seule</span>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 pt-0">
                  {/* Bloc notation */}
                  {taux != null && notation && (
                    <div
                      className="rounded-xl border p-4 space-y-3"
                      style={{
                        borderColor: `${notation.chartColor}30`,
                        backgroundColor: `${notation.chartColor}08`,
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Taux d&apos;atteinte</p>
                          <p
                            className="text-2xl font-bold tabular-nums"
                            style={{ color: notation.chartColor }}
                          >
                            {taux.toFixed(1)}%
                          </p>
                        </div>
                        <NotationBadge taux={taux} showCommentaire />
                      </div>
                      <div className="h-2 rounded-full bg-background/80 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${Math.min(100, taux)}%`,
                            backgroundColor: notation.chartColor,
                          }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                        {notation.commentaire}
                      </p>
                    </div>
                  )}

                  {/* Champs saisie */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`prevu-${k.id}`} className="text-xs text-muted-foreground">
                        Prévu {unite && `(${unite})`}
                      </Label>
                      <Input
                        id={`prevu-${k.id}`}
                        type="text"
                        inputMode="decimal"
                        disabled={readOnly}
                        value={form[k.id]?.prevu ?? ''}
                        onChange={(e) => setField(k.id, 'prevu', e.target.value)}
                        placeholder="—"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`realise-${k.id}`} className="text-xs text-muted-foreground">
                        Réalisé {unite && `(${unite})`}
                      </Label>
                      <Input
                        id={`realise-${k.id}`}
                        type="text"
                        inputMode="decimal"
                        disabled={readOnly}
                        value={form[k.id]?.realise ?? ''}
                        onChange={(e) => setField(k.id, 'realise', e.target.value)}
                        placeholder="—"
                        className="h-10 font-medium"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label
                        htmlFor={`comment-${k.id}`}
                        className="text-xs text-muted-foreground flex items-center gap-1"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Commentaire de saisie
                      </Label>
                      <Textarea
                        id={`comment-${k.id}`}
                        disabled={readOnly}
                        value={form[k.id]?.commentaire ?? ''}
                        onChange={(e) => setField(k.id, 'commentaire', e.target.value)}
                        placeholder="Précisions, contexte, écarts…"
                        rows={2}
                        className="resize-none text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Actions bas de page */}
      {saisieModifiable && kpiDirections.length > 0 && !loading && (
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={handleSave} disabled={saving || submitting}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer le brouillon
          </Button>
          <Button onClick={handleSubmitAll} disabled={saving || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Soumettre pour validation
          </Button>
        </div>
      )}
    </div>
  )
}
