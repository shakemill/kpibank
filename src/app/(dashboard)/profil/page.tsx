'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock, AlertCircle, Phone, User, Mail, Shield } from 'lucide-react'
import { libellerRole } from '@/lib/role-labels'

type ProfilData = {
  id: number
  nom: string
  prenom: string
  email: string
  telephone: string | null
}

export default function ProfilPage() {
  const router = useRouter()
  const { data: session, update: updateSession } = useSession()
  const [tab, setTab] = useState('infos')

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
  const [profil, setProfil] = useState<ProfilData | null>(null)

  const forceChange =
    (session?.user as { force_password_change?: boolean })?.force_password_change ?? false
  const role = (session?.user as { role?: string })?.role ?? ''
  const perimetreLabel = (session?.user as { perimetreLabel?: string | null })?.perimetreLabel

  useEffect(() => {
    if (forceChange) setTab('securite')
  }, [forceChange])

  useEffect(() => {
    let cancelled = false
    fetch('/api/profil')
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok || cancelled) return
        setProfil(data)
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
      setProfil((p) => (p ? { ...p, telephone: data.telephone ?? null } : p))
      setPhoneSuccess(true)
      setPhoneLoading(false)
    } catch {
      setPhoneError('Erreur réseau.')
      setPhoneLoading(false)
    }
  }

  const displayName =
    profil != null
      ? `${profil.prenom} ${profil.nom}`.trim()
      : `${(session?.user as { prenom?: string })?.prenom ?? ''} ${(session?.user as { nom?: string })?.nom ?? ''}`.trim() ||
        '—'

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon profil</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {forceChange
            ? 'Vous devez changer votre mot de passe pour continuer.'
            : 'Consultez vos informations et gérez votre compte.'}
        </p>
      </div>

      {forceChange && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Pour des raisons de sécurité, changez votre mot de passe dans l&apos;onglet{' '}
            <button
              type="button"
              className="font-medium underline underline-offset-2"
              onClick={() => setTab('securite')}
            >
              Sécurité
            </button>{' '}
            avant d&apos;accéder à l&apos;application.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="infos" className="gap-1.5 py-2" disabled={forceChange}>
            <User className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Informations</span>
            <span className="sm:hidden">Infos</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-1.5 py-2" disabled={forceChange}>
            <Phone className="h-4 w-4 shrink-0" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="securite" className="gap-1.5 py-2">
            <Shield className="h-4 w-4 shrink-0" />
            Sécurité
            {forceChange && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                Requis
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="infos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Informations du compte
              </CardTitle>
              <CardDescription>Données issues de votre compte — lecture seule.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileLoading ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : (
                <dl className="space-y-3">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4 py-2 border-b border-border/50">
                    <dt className="text-sm text-muted-foreground sm:w-36 shrink-0">Nom complet</dt>
                    <dd className="text-sm font-medium">{displayName || '—'}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4 py-2 border-b border-border/50">
                    <dt className="text-sm text-muted-foreground sm:w-36 shrink-0 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      E-mail
                    </dt>
                    <dd className="text-sm font-medium break-all">
                      {profil?.email ?? (session?.user as { email?: string })?.email ?? '—'}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4 py-2 border-b border-border/50">
                    <dt className="text-sm text-muted-foreground sm:w-36 shrink-0">Rôle</dt>
                    <dd className="text-sm">
                      <Badge variant="secondary" className="font-normal">
                        {libellerRole(role)}
                      </Badge>
                    </dd>
                  </div>
                  {perimetreLabel && (
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4 py-2">
                      <dt className="text-sm text-muted-foreground sm:w-36 shrink-0">Périmètre</dt>
                      <dd className="text-sm font-medium">{perimetreLabel}</dd>
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                Téléphone
              </CardTitle>
              <CardDescription>Numéro de contact associé à votre compte (optionnel).</CardDescription>
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
        </TabsContent>

        <TabsContent value="securite" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Changer le mot de passe
              </CardTitle>
              <CardDescription>
                Minimum 8 caractères, dont 1 majuscule et 1 chiffre.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
