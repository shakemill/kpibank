'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  ArrowLeft,
  Save,
  RotateCcw,
  Gauge,
  SlidersHorizontal,
  Wand2,
  Sparkles,
  MessageSquareQuote,
  Percent,
  Eye,
} from 'lucide-react'
import {
  DEFAULT_GRILLE_CONFIG,
  formatNotationLabel,
  getNotationDisplay,
  type GrilleNiveauConfig,
} from '@/lib/notation-grille-config'
import { getNotationGrille, type NiveauNotation } from '@/lib/notation-grille'
import { useNotationGrille } from '@/contexts/notation-grille-context'
import { cn } from '@/lib/utils'

type GrilleRow = GrilleNiveauConfig & { notation: string }

const NIVEAU_META: Record<
  NiveauNotation,
  { label: string; ordre: number }
> = {
  EXCELLENT: { label: 'Excellent', ordre: 1 },
  TRES_BIEN: { label: 'Très bien', ordre: 2 },
  SATISFAISANT: { label: 'Satisfaisant', ordre: 3 },
  MOYEN: { label: 'Moyen', ordre: 4 },
  INSUFFISANT: { label: 'Insuffisant', ordre: 5 },
}

function toGrilleRows(niveaux: GrilleNiveauConfig[]): GrilleRow[] {
  return niveaux
    .sort((a, b) => a.ordre - b.ordre)
    .map((row) => ({
      ...row,
      notation: getNotationDisplay(row),
    }))
}

function NiveauCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}

export default function GrilleNotationAdminPage() {
  const { refresh } = useNotationGrille()
  const [rows, setRows] = useState<GrilleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewScore, setPreviewScore] = useState(85)
  const [dirty, setDirty] = useState(false)

  const fetchGrille = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/notation-grille')
    setLoading(false)
    if (!res.ok) {
      toast({ title: 'Erreur', description: 'Chargement de la grille', variant: 'destructive' })
      return
    }
    const data = await res.json()
    setRows(toGrilleRows(data.niveaux ?? DEFAULT_GRILLE_CONFIG))
    setDirty(false)
  }, [])

  useEffect(() => {
    fetchGrille()
  }, [fetchGrille])

  const markDirty = useCallback(() => setDirty(true), [])

  const updateRow = (niveau: string, patch: Partial<GrilleNiveauConfig>) => {
    markDirty()
    setRows((prev) =>
      prev.map((row) => {
        if (row.niveau !== niveau) return row
        const next = { ...row, ...patch }
        return { ...next, notation: getNotationDisplay(next) }
      })
    )
  }

  const updateSeuil = (niveau: string, field: 'seuilMin' | 'seuilMax', value: string) => {
    markDirty()
    setRows((prev) =>
      prev.map((row) => {
        if (row.niveau !== niveau) return row
        const num = value === '' ? null : parseFloat(value)
        const seuilMin =
          field === 'seuilMin'
            ? Number.isNaN(num)
              ? row.seuilMin
              : (num as number)
            : row.seuilMin
        const seuilMax = field === 'seuilMax' ? num : row.seuilMax
        const next = { ...row, seuilMin, seuilMax }
        return { ...next, notation: getNotationDisplay(next) }
      })
    )
  }

  const syncNotationFromSeuils = (niveau: string) => {
    markDirty()
    setRows((prev) =>
      prev.map((row) => {
        if (row.niveau !== niveau) return row
        const libelle = formatNotationLabel(row.seuilMin, row.seuilMax)
        const next = { ...row, notationLibelle: libelle }
        return { ...next, notation: libelle }
      })
    )
  }

  const handleReset = () => {
    setRows(toGrilleRows(DEFAULT_GRILLE_CONFIG))
    markDirty()
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/notation-grille', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        niveaux: rows.map(({ notation: _n, ...rest }) => ({
          ...rest,
          notationLibelle: rest.notationLibelle?.trim() || getNotationDisplay(rest),
        })),
      }),
    })
    setSaving(false)
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast({
        title: 'Erreur',
        description: data?.error ?? 'Enregistrement impossible',
        variant: 'destructive',
      })
      return
    }
    setRows(toGrilleRows(data.niveaux ?? rows))
    setDirty(false)
    await refresh()
    toast({
      title: 'Grille enregistrée',
      description: 'Les modifications sont actives dans toute l’application.',
    })
  }

  const previewNotation = useMemo(
    () => getNotationGrille(previewScore, rows),
    [previewScore, rows]
  )

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-24">
      {/* En-tête */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-4">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground" asChild>
            <Link href="/dashboard/admin">
              <ArrowLeft className="h-4 w-4" />
              Administration
            </Link>
          </Button>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-emerald-600/10 ring-1 ring-teal-500/20 shadow-sm shrink-0">
              <Gauge className="h-7 w-7 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Grille de notation</h1>
              <p className="text-muted-foreground mt-1.5 max-w-xl leading-relaxed">
                Définissez les seuils, libellés et commentaires utilisés pour évaluer les scores
                globaux de performance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:pt-10">
          <Button variant="outline" className="gap-2" onClick={handleReset} disabled={loading || saving}>
            <RotateCcw className="h-4 w-4" />
            Réinitialiser
          </Button>
          <Button className="gap-2 shadow-sm" onClick={handleSave} disabled={loading || saving || !dirty}>
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      {dirty && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Modifications non enregistrées — pensez à sauvegarder avant de quitter la page.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Aperçu interactif */}
        <Card className="lg:col-span-2 overflow-hidden border shadow-sm">
          <CardHeader className="pb-3 bg-muted/30 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Aperçu en direct
            </CardTitle>
            <CardDescription>
              Simulez un score pour voir le rendu final
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="text-center space-y-1">
              <p
                className="text-5xl font-bold tabular-nums tracking-tight"
                style={{ color: previewNotation.chartColor }}
              >
                {previewScore.toFixed(1)}%
              </p>
              <Badge
                variant="outline"
                className={cn('text-sm px-3 py-1', previewNotation.badgeClassName)}
              >
                {previewNotation.appreciation}
              </Badge>
            </div>

            <div className="space-y-3 px-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span className="font-medium text-foreground">{previewScore}%</span>
                <span>150%</span>
              </div>
              <Slider
                value={[previewScore]}
                onValueChange={([v]) => setPreviewScore(v)}
                min={0}
                max={150}
                step={0.5}
                className="cursor-pointer"
              />
              <Input
                type="number"
                min={0}
                max={200}
                step={0.1}
                value={previewScore}
                onChange={(e) => {
                  const n = parseFloat(e.target.value)
                  if (!Number.isNaN(n)) setPreviewScore(Math.min(200, Math.max(0, n)))
                }}
                className="h-9 text-center tabular-nums"
              />
            </div>

            <div className="rounded-xl bg-muted/40 border p-4 flex gap-3">
              <MessageSquareQuote className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {previewNotation.commentaire}
              </p>
            </div>

            {/* Échelle visuelle */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Échelle des niveaux
              </p>
              <div className="flex rounded-lg overflow-hidden h-3 ring-1 ring-border">
                {rows.map((row) => (
                    <div
                      key={row.niveau}
                      className="flex-1 transition-colors"
                      style={{ backgroundColor: getNotationGrille(row.seuilMin, rows).chartColor }}
                      title={row.appreciation}
                    />
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {rows.map((row) => {
                  const n = getNotationGrille(row.seuilMin, rows)
                  return (
                    <span
                      key={row.niveau}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border"
                      style={{
                        borderColor: `${n.chartColor}40`,
                        backgroundColor: `${n.chartColor}12`,
                        color: n.chartColor,
                      }}
                    >
                      {row.notation}
                    </span>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Référentiel lecture seule */}
        <Card className="lg:col-span-3 overflow-hidden border-2 shadow-sm">
          <div className="bg-gradient-to-r from-[#c5e0b4] to-[#d4e8c8] dark:from-emerald-900/50 dark:to-emerald-800/30 px-5 py-4 border-b flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold tracking-widest text-[#1e3a5f] dark:text-emerald-100 uppercase">
              Référentiel officiel
            </h2>
            <Badge variant="secondary" className="bg-white/60 dark:bg-black/20 text-xs">
              5 niveaux
            </Badge>
          </div>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-5 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <NiveauCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="divide-y">
                {rows.map((row) => {
                  const meta = NIVEAU_META[row.niveau as NiveauNotation]
                  const notationStyle = getNotationGrille(row.seuilMin, rows)
                  return (
                    <div
                      key={row.niveau}
                      className="group relative flex gap-0 hover:bg-muted/20 transition-colors"
                    >
                      <div
                        className="w-1.5 shrink-0"
                        style={{ backgroundColor: notationStyle.chartColor }}
                      />
                      <div className="flex-1 p-5 grid gap-4 sm:grid-cols-12 sm:gap-5 items-start">
                        {/* En-tête niveau */}
                        <div className="sm:col-span-12 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                              style={{ backgroundColor: notationStyle.chartColor }}
                            >
                              {meta.ordre}
                            </span>
                            <span className="font-semibold text-sm">{meta.label}</span>
                          </div>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs opacity-80 group-hover:opacity-100"
                              >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                Seuils
                                <span className="text-muted-foreground font-normal">
                                  {row.seuilMin}
                                  {row.seuilMax != null ? `–${row.seuilMax}` : '+'}%
                                </span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72" align="end">
                              <div className="space-y-4">
                                <div>
                                  <p className="text-sm font-semibold">Seuils de calcul</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Plage de scores attribuée à ce niveau
                                  </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Minimum %</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={200}
                                      value={row.seuilMin}
                                      onChange={(e) =>
                                        updateSeuil(row.niveau, 'seuilMin', e.target.value)
                                      }
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Maximum %</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={200}
                                      placeholder="∞"
                                      value={row.seuilMax ?? ''}
                                      onChange={(e) =>
                                        updateSeuil(row.niveau, 'seuilMax', e.target.value)
                                      }
                                      className="h-9"
                                    />
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="w-full gap-2"
                                  onClick={() => syncNotationFromSeuils(row.niveau)}
                                >
                                  <Wand2 className="h-3.5 w-3.5" />
                                  Générer le libellé notation
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Notation */}
                        <div className="sm:col-span-3 space-y-1.5">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            Notation
                          </Label>
                          <Input
                            value={row.notationLibelle ?? row.notation}
                            onChange={(e) =>
                              updateRow(row.niveau, { notationLibelle: e.target.value })
                            }
                            className="h-10 font-semibold"
                          />
                        </div>

                        {/* Appréciation */}
                        <div className="sm:col-span-3 space-y-1.5">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Appréciation
                          </Label>
                          <Input
                            value={row.appreciation}
                            onChange={(e) =>
                              updateRow(row.niveau, { appreciation: e.target.value })
                            }
                            className="h-10"
                          />
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] mt-1', notationStyle.badgeClassName)}
                          >
                            Aperçu : {row.appreciation || '—'}
                          </Badge>
                        </div>

                        {/* Commentaires */}
                        <div className="sm:col-span-6 space-y-1.5">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <MessageSquareQuote className="h-3 w-3" />
                            Commentaires
                          </Label>
                          <Textarea
                            value={row.commentaire}
                            onChange={(e) =>
                              updateRow(row.niveau, { commentaire: e.target.value })
                            }
                            rows={2}
                            className="min-h-[72px] text-sm resize-none leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Barre d'action fixe mobile */}
      {dirty && (
        <div className="fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur p-4 lg:hidden">
          <Button className="w-full gap-2" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </Button>
        </div>
      )}
    </div>
  )
}
