'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, AlertCircle, Check, Edit } from 'lucide-react'
import { formaterNomKpiAffichage } from '@/lib/kpi-cible-utils'

type ContestationRow = {
  id: number
  cible: number
  poids: number
  statut: string
  motif_contestation: string | null
  reponse_contestation: string | null
  catalogueKpi: { nom: string }
  employe: { id: number; nom: string; prenom: string }
}

export default function ContestationsPage() {
  const router = useRouter()
  const [list, setList] = useState<ContestationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [respondingId, setRespondingId] = useState<number | null>(null)
  const [reponse, setReponse] = useState('')
  const [action, setAction] = useState<'MAINTENU' | 'REVISE'>('MAINTENU')
  const [reviseCible, setReviseCible] = useState('')
  const [revisePoids, setRevisePoids] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<ContestationRow | null>(null)

  const fetchContestations = useCallback(async () => {
    const res = await fetch('/api/kpi/employe?statut=CONTESTE')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? 'Chargement', variant: 'destructive' })
      return
    }
    const data = await res.json()
    setList(data.list ?? [])
  }, [])

  useEffect(() => {
    fetchContestations().finally(() => setLoading(false))
  }, [fetchContestations])

  const openRespond = (row: ContestationRow) => {
    setSelectedRow(row)
    setReponse('')
    setAction('MAINTENU')
    setReviseCible(String(row.cible))
    setRevisePoids(String(row.poids))
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!selectedRow) return
    if (!reponse.trim()) {
      toast({ title: 'La réponse est obligatoire', variant: 'destructive' })
      return
    }
    setRespondingId(selectedRow.id)
    const body: { reponse_contestation: string; action: 'MAINTENU' | 'REVISE'; cible?: number; poids?: number } = {
      reponse_contestation: reponse.trim(),
      action,
    }
    if (action === 'REVISE') {
      const cibleNum = parseFloat(reviseCible)
      const poidsNum = parseFloat(revisePoids)
      if (Number.isNaN(cibleNum) || Number.isNaN(poidsNum)) {
        toast({ title: 'Cible et poids requis pour réviser', variant: 'destructive' })
        setRespondingId(null)
        return
      }
      body.cible = cibleNum
      body.poids = poidsNum
    }
    const res = await fetch(`/api/kpi/employe/${selectedRow.id}/repondre-contestation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    setRespondingId(null)
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Envoi', variant: 'destructive' })
      return
    }
    toast({ title: action === 'MAINTENU' ? 'KPI maintenu' : 'KPI révisé' })
    setModalOpen(false)
    setSelectedRow(null)
    fetchContestations()
  }

  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.push('/manager/assignation')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Contestations</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Répondre aux contestations des employés : maintenir ou réviser le KPI.
          </p>
        </div>
      </div>

      <Card className="border-border/50 overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">KPI contestés</CardTitle>
              <CardDescription>Motif de l&apos;employé et formulaire de réponse</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-w-0">
          {loading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : list.length === 0 ? (
            <p className="text-muted-foreground py-4">Aucune contestation en cours.</p>
          ) : (
            <div className="space-y-3">
              {list.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-border/60 p-4 space-y-3 min-w-0"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">
                        {row.employe.prenom} {row.employe.nom}
                      </p>
                      <p className="text-sm break-words leading-snug text-muted-foreground">
                        {formaterNomKpiAffichage(row.catalogueKpi.nom)}
                      </p>
                    </div>
                    <p className="text-sm shrink-0 text-muted-foreground sm:text-right">
                      Cible <span className="font-medium text-foreground">{row.cible}</span>
                      {row.poids > 0 && (
                        <>
                          {' · '}
                          Poids <span className="font-medium text-foreground">{row.poids}%</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="rounded-lg bg-muted/40 p-3 min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                      Motif de contestation
                    </p>
                    <p className="text-sm break-words whitespace-pre-wrap">
                      {row.motif_contestation ?? '—'}
                    </p>
                  </div>

                  {row.reponse_contestation && (
                    <div className="rounded-lg border border-border/60 p-3 min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                        Votre réponse
                      </p>
                      <p className="text-sm break-words whitespace-pre-wrap text-muted-foreground">
                        {row.reponse_contestation}
                      </p>
                    </div>
                  )}

                  {!row.reponse_contestation && (
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => openRespond(row)}>
                        Répondre
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Répondre à la contestation</DialogTitle>
            {selectedRow && (
              <p className="text-sm text-muted-foreground">
                {selectedRow.employe.prenom} {selectedRow.employe.nom} — {selectedRow.catalogueKpi.nom}
              </p>
            )}
          </DialogHeader>
          {selectedRow && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Motif de l&apos;employé</label>
                <p className="text-sm text-muted-foreground rounded border p-3 bg-muted/50">
                  {selectedRow.motif_contestation}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Votre réponse (obligatoire)</label>
                <Textarea
                  className="min-h-[80px]"
                  value={reponse}
                  onChange={(e) => setReponse(e.target.value)}
                  placeholder="Réponse à l'employé..."
                />
              </div>
              <div className="flex gap-4">
                <Button
                  variant={action === 'MAINTENU' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAction('MAINTENU')}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Maintenir le KPI
                </Button>
                <Button
                  variant={action === 'REVISE' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAction('REVISE')}
                >
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Réviser le KPI
                </Button>
              </div>
              {action === 'REVISE' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Nouvelle cible</label>
                    <Input
                      type="number"
                      step="any"
                      value={reviseCible}
                      onChange={(e) => setReviseCible(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Nouveau poids (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={revisePoids}
                      onChange={(e) => setRevisePoids(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!reponse.trim() || respondingId === selectedRow.id}
                >
                  {respondingId === selectedRow.id ? 'Envoi...' : 'Envoyer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
