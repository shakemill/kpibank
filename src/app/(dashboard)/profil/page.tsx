'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, AlertCircle } from 'lucide-react'

export default function ProfilPage() {
  const router = useRouter()
  const { data: session, update: updateSession } = useSession()
  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const forceChange = (session?.user as { force_password_change?: boolean })?.force_password_change ?? false

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    const n = nouveau.trim()
    const c = confirmation.trim()
    if (!ancien) {
      setError('Ancien mot de passe requis.')
      return
    }
    if (!n) {
      setError('Nouveau mot de passe requis.')
      return
    }
    if (n.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(n)) {
      setError('Le nouveau mot de passe doit contenir au moins une majuscule et un chiffre.')
      return
    }
    if (n !== c) {
      setError('La confirmation ne correspond pas au nouveau mot de passe.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/profil/changer-mot-de-passe', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ancienMotDePasse: ancien,
          nouveauMotDePasse: n,
          confirmation: c,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Erreur lors du changement.')
        setLoading(false)
        return
      }
      setSuccess(true)
      setAncien('')
      setNouveau('')
      setConfirmation('')
      await updateSession?.()
      setLoading(false)
      if (forceChange) router.replace('/dashboard')
    } catch {
      setError('Erreur réseau.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="text-muted-foreground">
          {forceChange
            ? 'Vous devez changer votre mot de passe pour continuer.'
            : 'Modifiez votre mot de passe.'}
        </p>
      </div>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Changer le mot de passe
          </CardTitle>
          <CardDescription>
            Saisissez votre mot de passe actuel et le nouveau (min. 8 caractères, 1 majuscule, 1 chiffre).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {forceChange && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Pour des raisons de sécurité, vous devez changer votre mot de passe avant d&apos;accéder à l&apos;application.
                </AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="border-green-500 text-green-700 dark:text-green-400">
                <AlertDescription>Mot de passe modifié avec succès.</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="ancien">Ancien mot de passe</Label>
              <Input
                id="ancien"
                type="password"
                value={ancien}
                onChange={(e) => setAncien(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nouveau">Nouveau mot de passe</Label>
              <Input
                id="nouveau"
                type="password"
                value={nouveau}
                onChange={(e) => setNouveau(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmation">Confirmation</Label>
              <Input
                id="confirmation"
                type="password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'En cours…' : 'Changer le mot de passe'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
