'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { TableSkeleton } from '@/components/table-skeleton'
import { Target, Plus, Edit, Ban, CheckCircle, Search, ListChecks, BarChart3, Star, TrendingUp, ArrowLeft } from 'lucide-react'

type CatalogueRow = {
  id: number
  nom: string
  description: string | null
  type: string
  unite: string | null
  mode_agregation: string
  actif: boolean
}

const TYPE_OPTIONS = [
  { value: 'QUANTITATIF', label: 'Quantitatif' },
  { value: 'QUALITATIF', label: 'Qualitatif' },
  { value: 'COMPORTEMENTAL', label: 'Comportemental' },
] as const

const MODE_OPTIONS = [
  { value: 'CUMUL', label: 'Cumul', desc: 'Somme des valeurs mensuelles' },
  { value: 'MOYENNE', label: 'Moyenne', desc: 'Moyenne des valeurs mensuelles' },
  { value: 'DERNIER', label: 'Dernier', desc: 'Valeur du dernier mois de la période' },
] as const

const TYPE_CONFIG: Record<string, { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }> = {
  QUANTITATIF: { label: 'Quantitatif', className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200', Icon: BarChart3 },
  QUALITATIF: { label: 'Qualitatif', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200', Icon: Star },
  COMPORTEMENTAL: { label: 'Comportemental', className: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200', Icon: TrendingUp },
}

const MODE_CONFIG: Record<string, { label: string; className: string }> = {
  CUMUL: { label: 'Cumul', className: 'bg-slate-500/10 text-slate-700 dark:text-slate-400' },
  MOYENNE: { label: 'Moyenne', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
  DERNIER: { label: 'Dernier', className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400' },
}

export default function CatalogueKpiPage() {
  const [list, setList] = useState<CatalogueRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actifFilter, setActifFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [uniteFilter, setUniteFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editRow, setEditRow] = useState<CatalogueRow | null>(null)
  const [formNom, setFormNom] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formType, setFormType] = useState<string>('QUANTITATIF')
  const [formUnite, setFormUnite] = useState('')
  const [formMode, setFormMode] = useState<string>('CUMUL')
  const [formActif, setFormActif] = useState(true)
  const [saving, setSaving] = useState(false)

  const [confirmAction, setConfirmAction] = useState<'desactiver' | 'activer' | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<CatalogueRow | null>(null)

  const fetchList = useCallback(async () => {
    const params = new URLSearchParams()
    if (actifFilter === 'true') params.set('actif', 'true')
    else if (actifFilter === 'false') params.set('actif', 'false')
    const res = await fetch(`/api/kpi/catalogue?${params.toString()}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? 'Chargement catalogue', variant: 'destructive' })
      return
    }
    const data = await res.json()
    setList(data)
  }, [actifFilter])

  useEffect(() => {
    fetchList().finally(() => setLoading(false))
  }, [fetchList])

  const openAdd = () => {
    setEditRow(null)
    setFormNom('')
    setFormDescription('')
    setFormType('QUANTITATIF')
    setFormUnite('')
    setFormMode('CUMUL')
    setFormActif(true)
    setModalOpen(true)
  }

  const openEdit = (row: CatalogueRow) => {
    setEditRow(row)
    setFormNom(row.nom)
    setFormDescription(row.description ?? '')
    setFormType(row.type)
    setFormUnite(row.unite ?? '')
    setFormMode(row.mode_agregation)
    setFormActif(row.actif)
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const nom = formNom.trim()
    if (!nom) {
      toast({ title: 'Le nom est requis', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      if (editRow) {
        const res = await fetch(`/api/kpi/catalogue/${editRow.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom,
            description: formDescription.trim() || null,
            type: formType,
            unite: formUnite.trim() || null,
            mode_agregation: formMode,
            actif: formActif,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast({ title: 'Erreur', description: data?.error ?? 'Mise à jour', variant: 'destructive' })
          return
        }
        toast({ title: 'KPI catalogue mis à jour' })
      } else {
        const res = await fetch('/api/kpi/catalogue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom,
            description: formDescription.trim() || null,
            type: formType,
            unite: formUnite.trim() || null,
            mode_agregation: formMode,
            actif: formActif,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          toast({ title: 'Erreur', description: data?.error ?? 'Création', variant: 'destructive' })
          return
        }
        toast({ title: 'KPI catalogue créé' })
      }
      setModalOpen(false)
      fetchList()
    } finally {
      setSaving(false)
    }
  }

  const handleDesactiver = async () => {
    if (!confirmTarget) return
    const res = await fetch(`/api/kpi/catalogue/${confirmTarget.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Désactivation', variant: 'destructive' })
      return
    }
    toast({ title: 'KPI désactivé' })
    setConfirmAction(null)
    setConfirmTarget(null)
    fetchList()
  }

  const handleActiver = async () => {
    if (!confirmTarget) return
    const res = await fetch(`/api/kpi/catalogue/${confirmTarget.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: true }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Activation', variant: 'destructive' })
      return
    }
    toast({ title: 'KPI activé' })
    setConfirmAction(null)
    setConfirmTarget(null)
    fetchList()
  }

  const uniqueUnites = useMemo(() => {
    const units = new Set<string>()
    list.forEach((r) => {
      if (r.unite?.trim()) units.add(r.unite.trim())
    })
    return Array.from(units).sort()
  }, [list])

  const filteredList = useMemo(() => {
    let items = list
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      items = items.filter(
        (r) =>
          r.nom.toLowerCase().includes(q) ||
          (r.description?.toLowerCase().includes(q)) ||
          (r.unite?.toLowerCase().includes(q))
      )
    }
    if (typeFilter !== 'all') items = items.filter((r) => r.type === typeFilter)
    if (uniteFilter !== 'all') items = items.filter((r) => (r.unite?.trim() ?? '') === uniteFilter)
    return items
  }, [list, searchQuery, typeFilter, uniteFilter])

  return (
    <TooltipProvider>
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="w-fit gap-2 -ml-2" asChild>
          <Link href="/dashboard/admin" title="Retour à l&apos;administration">
            <ArrowLeft className="h-4 w-4" />
            Retour à l&apos;administration
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm shrink-0">
            <ListChecks className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Catalogue KPI</h1>
            <p className="text-muted-foreground mt-0.5">
              Configurer les indicateurs disponibles pour les directions (nom, type, unité, mode d&apos;agrégation).
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-row items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Indicateurs du catalogue</CardTitle>
                  <CardDescription>Liste des KPI que les directeurs peuvent affecter à leur direction</CardDescription>
                </div>
              </div>
              <Button onClick={openAdd} className="gap-2 h-9 shrink-0">
                <Plus className="h-4 w-4" />
                Ajouter un KPI
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-initial sm:w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher (nom, unité...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={uniteFilter} onValueChange={setUniteFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Unité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les unités</SelectItem>
                  {uniqueUnites.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={actifFilter} onValueChange={setActifFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="true">Actifs</SelectItem>
                  <SelectItem value="false">Inactifs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead>Mode agrégation</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.map((row) => {
                  const typeCfg = TYPE_CONFIG[row.type] ?? { label: row.type, className: '', Icon: Target }
                  const modeCfg = MODE_CONFIG[row.mode_agregation] ?? { label: row.mode_agregation, className: '' }
                  return (
                    <TableRow key={row.id} className="group hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{row.nom}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-muted-foreground" title={row.description ?? undefined}>
                        {row.description ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 border ${typeCfg.className}`}>
                          <typeCfg.Icon className="h-3 w-3" />
                          {typeCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.unite ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs font-normal ${modeCfg.className}`}>
                          {modeCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.actif ? 'default' : 'secondary'} className={row.actif ? 'bg-green-600 hover:bg-green-600' : ''}>
                          {row.actif ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Modifier</TooltipContent>
                          </Tooltip>
                          {row.actif ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => { setConfirmTarget(row); setConfirmAction('desactiver') }}
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Désactiver</TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-green-600"
                                  onClick={() => { setConfirmTarget(row); setConfirmAction('activer') }}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Activer</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          {!loading && filteredList.length === 0 && (() => {
            const hasFilters = searchQuery || typeFilter !== 'all' || uniteFilter !== 'all' || actifFilter !== 'all'
            return (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center border rounded-lg bg-muted/30">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <ListChecks className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-1">
                  {hasFilters ? 'Aucun résultat' : 'Aucun KPI dans le catalogue'}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 max-w-sm">
                  {hasFilters
                    ? 'Essayez une autre recherche ou modifiez les filtres.'
                    : 'Ajoutez des indicateurs pour que les directeurs puissent les affecter à leur direction.'}
                </p>
                {!hasFilters && (
                  <Button onClick={openAdd} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Ajouter un KPI
                  </Button>
                )}
              </div>
            )
          })()}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editRow ? 'Modifier le KPI catalogue' : 'Ajouter un KPI au catalogue'}</DialogTitle>
            <DialogDescription>
              {editRow ? 'Modifiez les propriétés de cet indicateur.' : 'Définissez un nouvel indicateur pour le catalogue.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="form-nom">Nom <span className="text-destructive">*</span></Label>
              <Input
                id="form-nom"
                value={formNom}
                onChange={(e) => setFormNom(e.target.value)}
                placeholder="Ex. Volume crédits accordés"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="form-desc">Description (optionnel)</Label>
              <Input
                id="form-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Description courte"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="form-unite">Unité (optionnel)</Label>
                <Input
                  id="form-unite"
                  value={formUnite}
                  onChange={(e) => setFormUnite(e.target.value)}
                  placeholder="Ex. M MAD, %, jours, /5"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Mode d&apos;agrégation</Label>
              <Select value={formMode} onValueChange={setFormMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} title={o.desc}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Cumul : somme des mois · Moyenne : moyenne mensuelle · Dernier : valeur du dernier mois
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Switch id="form-actif" checked={formActif} onCheckedChange={setFormActif} />
              <div>
                <Label htmlFor="form-actif" className="cursor-pointer font-medium">Actif</Label>
                <p className="text-xs text-muted-foreground">Visible dans le catalogue pour les directeurs</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Enregistrement...' : editRow ? 'Enregistrer' : 'Créer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmAction === 'desactiver'} onOpenChange={(o) => !o && (setConfirmAction(null), setConfirmTarget(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver ce KPI ?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget && (
                <>Le KPI « {confirmTarget.nom} » ne sera plus proposé aux directeurs. Les KPI direction déjà créés restent inchangés.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDesactiver}
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction === 'activer'} onOpenChange={(o) => !o && (setConfirmAction(null), setConfirmTarget(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activer ce KPI ?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget && <>Le KPI « {confirmTarget.nom} » sera à nouveau proposé aux directeurs.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleActiver}>Activer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  )
}
