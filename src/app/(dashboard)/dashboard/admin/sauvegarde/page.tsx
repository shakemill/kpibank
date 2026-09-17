'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Database, Download, Plus } from 'lucide-react'
import { TableSkeleton } from '@/components/table-skeleton'

type BackupRow = {
  filename: string
  size: number
  createdAt: string
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1).replace('.', ',')} Ko`
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return format(d, "d MMM yyyy 'à' HH:mm", { locale: fr })
}

async function triggerDownload(filename: string): Promise<void> {
  const res = await fetch(`/api/admin/backups/${encodeURIComponent(filename)}`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(typeof data?.error === 'string' ? data.error : 'Téléchargement impossible')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function AdminSauvegardePage() {
  const [backups, setBackups] = useState<BackupRow[]>([])
  const [keep, setKeep] = useState(10)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  const fetchBackups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/backups')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          title: 'Erreur',
          description: data?.error ?? 'Impossible de charger les sauvegardes',
          variant: 'destructive',
        })
        return
      }
      setBackups(Array.isArray(data.backups) ? data.backups : [])
      if (typeof data.keep === 'number') setKeep(data.keep)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBackups()
  }, [fetchBackups])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/backups', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          title: 'Erreur',
          description: data?.error ?? 'Échec de la sauvegarde',
          variant: 'destructive',
        })
        return
      }
      toast({
        title: 'Sauvegarde créée',
        description: `${data.filename} — ${Object.keys(data.tableCounts ?? {}).length} tables — ${formatBytes(data.size ?? 0)}`,
      })
      await fetchBackups()
      if (typeof data.filename === 'string') {
        await triggerDownload(data.filename)
      }
    } catch (e) {
      toast({
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Échec de la sauvegarde',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDownload = async (filename: string) => {
    setDownloading(filename)
    try {
      await triggerDownload(filename)
    } catch (e) {
      toast({
        title: 'Erreur',
        description: e instanceof Error ? e.message : 'Téléchargement impossible',
        variant: 'destructive',
      })
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 min-w-0">
          <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-0.5" asChild>
            <Link href="/dashboard/admin">
              <ArrowLeft className="h-4 w-4" />
              Retour à l&apos;administration
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Sauvegarde &amp; Export</h1>
              <p className="text-sm text-muted-foreground">
                Dump JSON compressé de toutes les tables PostgreSQL — les {keep} plus récentes sont conservées sur le serveur
              </p>
            </div>
          </div>
        </div>
        <Button className="gap-2 self-start" disabled={creating} onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          {creating ? 'Sauvegarde…' : 'Créer une sauvegarde'}
        </Button>
      </div>

      <Card className="border-border/60 overflow-hidden shadow-none">
        <CardHeader className="gap-1 border-b border-border/50 bg-gradient-to-b from-muted/40 to-muted/10 pb-4">
          <CardTitle className="text-base">Historique</CardTitle>
          <CardDescription>
            Téléchargez un fichier existant. En production, montez un volume persistant sur le
            répertoire de sauvegarde pour le conserver après un redéploiement.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={4} cols={4} />
            </div>
          ) : backups.length === 0 ? (
            <p className="text-sm text-muted-foreground px-6 py-10 text-center">
              Aucune sauvegarde pour le moment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fichier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Taille</TableHead>
                  <TableHead className="w-[140px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((row) => (
                  <TableRow key={row.filename}>
                    <TableCell className="font-mono text-xs sm:text-sm">{row.filename}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDateTime(row.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="tabular-nums font-normal">
                        {formatBytes(row.size)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={downloading === row.filename || creating}
                        onClick={() => handleDownload(row.filename)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {downloading === row.filename ? '…' : 'Télécharger'}
                      </Button>
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
