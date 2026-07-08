'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, AlertCircle, Phone } from 'lucide-react'

export default function ProfilPage() {
  const router = useRouter()
  const { data: session, update: updateSession } = useSession()
  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [telephone, setTelephone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [phoneSuccess, setPhoneSuccess] = useState(false)
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)

  const forceChange = (session?.user as { force_password_change?: boolean })?.force_password_change ?? false

  useEffect(() => {
    let cancelled = false
    fetch('/api/profil')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok || cancelled) return
        setTelephone(data.telephone ?? '')
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)
    const n = nouveau.trim()
    const c = confirmation.trim()
    if (!ancien) {
      setPasswordError('Ancien mot de passe requis.')
      return
    }
    if (!n) {
      setPasswordError('Nouveau mot de passe requis.')
      return
    }
    if (n.length < 8) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(n)) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins une majuscule et un chiffre.')
      return
    }
    if (n !== c) {
      setPasswordError('La confirmation ne correspond pas au nouveau mot de passe.')
      return
    }
    setPasswordLoading(true)
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
        setPasswordError(data?.error ?? 'Erreur lors du changement.')
        setPasswordLoading(false)
        return
      }
      setPasswordSuccess(true)
      setAncien('')
      setNouveau('')
      setConfirmation('')
      await updateSession?.()
      setPasswordLoading(false)
      if (forceChange) router.replace('/dashboard')
    } catch {
      setPasswordError('Erreur réseau.')
      setPasswordLoading(false)
    }
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPhoneError('')
    setPhoneSuccess(false)
    setPhoneLoading(true)
    try {
      const res = await fetch('/api/profil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: telephone.trim() || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPhoneError(data?.error ?? 'Erreur lors de la mise à jour.')
        setPhoneLoading(false)
        return
      }
      setTelephone(data.telephone ?? '')
      setPhoneSuccess(true)
      setPhoneLoading(false)
    } catch {
      setPhoneError('Erreur réseau.')
      setPhoneLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="text-muted-foreground">
          {forceChange
            ? 'Vous devez changer votre mot de passe pour continuer. Vous pouvez aussi mettre à jour votre téléphone.'
            : 'Modifiez votre téléphone et votre mot de passe.'}
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Téléphone
          </CardTitle>
          <CardDescription>
            Numéro de contact associé à votre compte (optionnel).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            {phoneError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{phoneError}</AlertDescription>
              </Alert>
            )}
            {phoneSuccess && (
              <Alert className="border-green-500 text-green-700 dark:text-green-400">
                <AlertDescription>Téléphone mis à jour avec succès.</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                type="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="+241 00 00 00 00"
                autoComplete="tel"
                disabled={profileLoading || phoneLoading}
              />
            </div>
            <Button type="submit" disabled={profileLoading || phoneLoading}>
              {phoneLoading ? 'En cours…' : 'Enregistrer le téléphone'}
            </Button>
          </form>
        </CardContent>
      </Card>

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
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {forceChange && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Pour des raisons de sécurité, vous devez changer votre mot de passe avant d&apos;accéder à l&apos;application.
                </AlertDescription>
              </Alert>
            )}
            {passwordError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}
            {passwordSuccess && (
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
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? 'En cours…' : 'Changer le mot de passe'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
