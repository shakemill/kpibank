'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Settings, Mail, Calendar, Bell, KeyRound, Save } from 'lucide-react'

function paramIcon(cle: string): typeof Calendar {
  if (cle.includes('DELAI') || cle.includes('JOUR')) return Calendar
  if (cle.includes('RAPPEL') || cle.includes('NOTIFICATION')) return Bell
  if (cle.includes('MAIL') || cle.includes('EMAIL') || cle.includes('SMTP')) return Mail
  return KeyRound
}

type ParametreRow = {
  id: number
  cle: string
  valeur: string
  description: string | null
  modifie_le: string
  modifiePar: { id: number; nom: string; prenom: string }
}

function paramType(cle: string): 'number' | 'boolean' | 'text' {
  if (cle.includes('DELAI') && cle.includes('JOUR')) return 'number'
  if (cle.includes('RAPPEL') || /_(ACTIF|ENABLED|ACTIVE)$/i.test(cle)) return 'boolean'
  return 'text'
}

function formatDate(s: string) {
  try {
    const d = new Date(s)
    return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return s
  }
}

export default function ParametresPage() {
  const [params, setParams] = useState<ParametreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [confirmSave, setConfirmSave] = useState<{ cle: string; valeur: string } | null>(null)
  const [testEmailTo, setTestEmailTo] = useState('')
  const [testEmailSending, setTestEmailSending] = useState(false)

  const fetchParams = useCallback(async () => {
    const res = await fetch('/api/parametres')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? res.statusText, variant: 'destructive' })
      return
    }
    const data = await res.json()
    setParams(data)
    setEditing({})
  }, [])

  useEffect(() => {
    fetchParams().finally(() => setLoading(false))
  }, [fetchParams])

  const handleSave = async (cle: string, valeur: string) => {
    setConfirmSave({ cle, valeur })
  }

  const confirmSaveOk = async () => {
    if (!confirmSave) return
    const { cle, valeur } = confirmSave
    setSaving(cle)
    setConfirmSave(null)
    const res = await fetch(`/api/parametres/${encodeURIComponent(cle)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valeur }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(null)
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Échec sauvegarde', variant: 'destructive' })
      return
    }
    toast({ title: 'Paramètre enregistré' })
    fetchParams()
  }

  const handleTestEmail = async () => {
    const to = testEmailTo.trim()
    if (!to) {
      toast({ title: 'Erreur', description: 'Indiquez une adresse email', variant: 'destructive' })
      return
    }
    setTestEmailSending(true)
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec envoi', variant: 'destructive' })
        return
      }
      toast({ title: 'Email envoyé', description: `Message de test envoyé à ${to}.` })
    } finally {
      setTestEmailSending(false)
    }
  }

  return (
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
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Paramètres généraux</h1>
            <p className="text-muted-foreground mt-0.5">
              Modifier les paramètres de l&apos;application.
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Paramètres système</CardTitle>
                <CardDescription>Clés de configuration et valeurs</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="email"
                placeholder="email@test.com"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                className="w-56 h-9"
              />
              <Button onClick={handleTestEmail} disabled={testEmailSending} variant="outline" size="sm" className="gap-2 h-9">
                <Mail className="h-4 w-4" />
                {testEmailSending ? 'Envoi…' : 'Tester email'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {params.map((p) => {
            const type = paramType(p.cle)
            const currentValue = editing[p.cle] !== undefined ? editing[p.cle] : p.valeur
            const isDirty = currentValue !== p.valeur
            const Icon = paramIcon(p.cle)
            return (
              <Card key={p.id} className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 break-words">
                      <CardTitle className="font-mono text-sm font-medium break-words">{p.cle}</CardTitle>
                      <CardDescription className="text-xs whitespace-pre-wrap break-words">
                        {p.description ?? '—'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    {type === 'number' && (
                      <Input
                        type="number"
                        min={1}
                        max={28}
                        value={currentValue}
                        onChange={(e) => setEditing((s) => ({ ...s, [p.cle]: e.target.value }))}
                        className="w-24"
                      />
                    )}
                    {type === 'boolean' && (
                      <Switch
                        checked={currentValue === 'true'}
                        onCheckedChange={(checked) =>
                          setEditing((s) => ({ ...s, [p.cle]: checked ? 'true' : 'false' }))
                        }
                      />
                    )}
                    {type === 'text' && (
                      <Input
                        value={currentValue}
                        onChange={(e) => setEditing((s) => ({ ...s, [p.cle]: e.target.value }))}
                        className="w-full"
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground break-words flex-1">
                      {p.modifiePar
                        ? `${p.modifiePar.prenom} ${p.modifiePar.nom} · ${formatDate(p.modifie_le)}`
                        : formatDate(p.modifie_le)}
                    </p>
                    <Button
                      size="sm"
                      disabled={!isDirty || saving === p.cle}
                      onClick={() => handleSave(p.cle, currentValue)}
                      className="gap-2 shrink-0"
                    >
                      <Save className="h-4 w-4" />
                      {saving === p.cle ? 'Enregistrement...' : 'Sauvegarder'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmSave} onOpenChange={(open) => !open && setConfirmSave(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enregistrer le paramètre ?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmSave && (
                <>Clé : {confirmSave.cle}. Nouvelle valeur : {confirmSave.valeur}</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSaveOk}>Sauvegarder</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
