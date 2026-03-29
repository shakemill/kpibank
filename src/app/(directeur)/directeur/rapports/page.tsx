'use client'

import { useCallback, useEffect, useState } from 'react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart3, Eye, Download } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  EMPLOYE: 'Employé',
  CHEF_SERVICE: 'Chef de service',
  DIRECTEUR: 'Directeur',
}

type PeriodeOption = { id: number; code: string }
type EquipeRow = {
  id: number
  nom: string
  prenom: string
  email: string
  role: string
  scoreGlobal: number
}
export default function DirecteurRapportsPage() {
  const [periodes, setPeriodes] = useState<PeriodeOption[]>([])
  const [periodeId, setPeriodeId] = useState<number | null>(null)
  const [list, setList] = useState<EquipeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)

  const fetchEquipe = useCallback(async () => {
    setLoading(true)
    const url =
      periodeId != null
        ? `/api/directeur/rapports/equipe?periodeId=${periodeId}`
        : '/api/directeur/rapports/equipe'
    const res = await fetch(url)
    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? 'Chargement', variant: 'destructive' })
      return
    }
    const data = await res.json()
    setList(data.list ?? [])
    if (data.periodes?.length && !periodes.length) setPeriodes(data.periodes)
    if (data.periodeId && !periodeId) setPeriodeId(data.periodeId)
  }, [periodeId, periodes.length])

  useEffect(() => {
    fetchEquipe()
  }, [fetchEquipe])

  const reportHref = useCallback(
    (row: EquipeRow) =>
      periodeId != null
        ? `/directeur/rapports/${row.id}?periodeId=${periodeId}`
        : `/directeur/rapports/${row.id}`,
    [periodeId]
  )

  const handleExportPdf = useCallback(
    async (row: EquipeRow) => {
      setPdfLoading(true)
      const url =
        periodeId != null
          ? `/api/directeur/rapports/${row.id}?periodeId=${periodeId}`
          : `/api/directeur/rapports/${row.id}`
      const res = await fetch(url)
      setPdfLoading(false)
      if (!res.ok) {
        toast({ title: 'Erreur', description: 'Chargement du rapport', variant: 'destructive' })
        return
      }
      const data = await res.json()
      const w = window.open('', '_blank', 'width=900,height=700')
      if (!w) {
        toast({ title: 'Erreur', description: 'Autorisez les pop-ups pour l\'export PDF', variant: 'destructive' })
        return
      }
      const scoreGlobal = (data.detailPeriode?.scoreGlobal ?? 0)
      const details = data.detailPeriode?.details ?? []
      const evolution = data.evolution ?? []
      const scoreParMois = data.scoreParMois ?? []
      w.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Rapport performance - ${data.user.prenom} ${data.user.nom}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; color: #1a1a1a; font-size: 14px; }
    h1 { font-size: 1.5rem; margin-bottom: 4px; }
    .meta { color: #666; margin-bottom: 24px; }
    .score-big { font-size: 2rem; font-weight: 700; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; }
    .text-right { text-align: right; }
    h2 { font-size: 1.1rem; margin-top: 24px; margin-bottom: 8px; }
    .chart-placeholder { background: #f9f9f9; padding: 24px; margin: 16px 0; border-radius: 8px; text-align: center; color: #666; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Rapport de performance</h1>
  <div class="meta">${data.user.prenom} ${data.user.nom} — ${ROLE_LABELS[data.user.role] || data.user.role} — Période ${data.periodeCode}</div>
  <h2>Score global période</h2>
  <div class="score-big">${scoreGlobal.toFixed(1)}%</div>
  ${
    data.comparaisonVsPrecedent != null
      ? `<p style="color:#666;">${data.comparaisonVsPrecedent >= 0 ? '+' : ''}${data.comparaisonVsPrecedent.toFixed(1)}% vs période précédente</p>`
      : ''
  }
  <h2>Détail par KPI</h2>
  <table>
    <thead><tr><th>KPI</th><th class="text-right">Cible</th><th class="text-right">Réalisé</th><th class="text-right">Taux %</th></tr></thead>
    <tbody>
      ${details.map((d) => `<tr><td>${d.nom}</td><td class="text-right">${d.cible}</td><td class="text-right">${d.realise}</td><td class="text-right">${d.taux.toFixed(1)}%</td></tr>`).join('')}
    </tbody>
  </table>
  ${
    evolution.length > 0
      ? `<h2>Évolution du score par période</h2><div class="chart-placeholder">Graphique : ${evolution.map((e) => `${e.code} ${e.scoreGlobal.toFixed(0)}%`).join(' → ')}</div>`
      : ''
  }
  ${
    scoreParMois.length > 0
      ? `<h2>Score par mois (période)</h2><div class="chart-placeholder">${scoreParMois.map((m) => `${m.label}: ${m.scorePct}%`).join(' | ')}</div>`
      : ''
  }
  <p style="margin-top:32px;color:#888;font-size:12px;">Généré le ${new Date().toLocaleDateString('fr-FR')} — Rapport KPI</p>
</body>
</html>`)
      w.document.close()
      w.focus()
      setTimeout(() => {
        w.print()
      }, 400)
    },
    [periodeId]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rapports de performance</h1>
        <p className="text-muted-foreground">
          Consulter et exporter en PDF le rapport de performance de chaque collaborateur de la direction (score période, global, par mois, graphiques).
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Équipe direction
              </CardTitle>
              <CardDescription>
                Sélectionnez une période puis consultez ou exportez le rapport de chaque personne.
              </CardDescription>
            </div>
            {periodes.length > 0 && (
              <Select
                value={periodeId != null ? String(periodeId) : ''}
                onValueChange={(v) => setPeriodeId(v ? parseInt(v, 10) : null)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  {periodes.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : list.length === 0 ? (
            <p className="text-muted-foreground">Aucun collaborateur dans la direction.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prénom</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-right">Score période</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.nom}</TableCell>
                    <TableCell>{row.prenom}</TableCell>
                    <TableCell>{ROLE_LABELS[row.role] ?? row.role}</TableCell>
                    <TableCell className="text-right">
                      {row.scoreGlobal > 0 ? `${row.scoreGlobal.toFixed(1)}%` : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          asChild
                        >
                          <Link href={reportHref(row)}>
                            <Eye className="h-3.5 w-3.5" />
                            Consulter
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => handleExportPdf(row)}
                          disabled={pdfLoading}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Export PDF
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
