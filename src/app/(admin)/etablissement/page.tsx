'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Building2, Save, Upload, Trash2 } from 'lucide-react'

type EtablissementRow = {
  id: number
  nom: string
  logo: string | null
  actif: boolean
}

export default function EtablissementPage() {
  const [etablissement, setEtablissement] = useState<EtablissementRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [nom, setNom] = useState('')
  const [logo, setLogo] = useState('')
  const [actif, setActif] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchEtablissement = useCallback(async () => {
    const res = await fetch('/api/etablissement')
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? res.statusText, variant: 'destructive' })
      return
    }
    const data: EtablissementRow = await res.json()
    setEtablissement(data)
    setNom(data.nom)
    setLogo(data.logo ?? '')
    setActif(data.actif)
  }, [])

  useEffect(() => {
    fetchEtablissement().finally(() => setLoading(false))
  }, [fetchEtablissement])

  const isDirty =
    etablissement &&
    (nom !== etablissement.nom || (logo || '') !== (etablissement.logo || '') || actif !== etablissement.actif)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    e.target.value = ''
    try {
      const formData = new FormData()
      formData.set('file', file)
      const res = await fetch('/api/etablissement/logo', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec upload', variant: 'destructive' })
        return
      }
      if (data.url) {
        setLogo(data.url)
        toast({ title: 'Image envoyée', description: 'Cliquez sur Enregistrer pour appliquer le logo.' })
      }
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = () => {
    setLogo('')
  }

  const handleSave = async () => {
    if (!isDirty) return
    setSaving(true)
    const res = await fetch('/api/etablissement', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: nom.trim(),
        logo: logo.trim() || null,
        actif,
      }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      toast({ title: 'Erreur', description: data?.error ?? 'Échec enregistrement', variant: 'destructive' })
      return
    }
    toast({ title: 'Informations enregistrées' })
    fetchEtablissement()
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="w-fit gap-2 -ml-2" asChild>
          <Link href="/dashboard/admin" title="Retour à la configuration">
            <ArrowLeft className="h-4 w-4" />
            Retour à la configuration
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm shrink-0">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Informations de l&apos;établissement</h1>
            <p className="text-muted-foreground mt-0.5">
              Modifier le nom et les informations de votre établissement.
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm max-w-2xl">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Détails de l&apos;établissement</CardTitle>
              <CardDescription>Nom, logo et statut de l&apos;établissement</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-32" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="nom" className="text-sm font-medium">
                  Nom de l&apos;établissement
                </label>
                <Input
                  id="nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex : Ma Banque"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Logo (optionnel)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <div className="flex flex-wrap items-start gap-4 rounded-lg border border-border/50 p-4">
                  {logo ? (
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      <Image
                        src={logo}
                        alt="Logo établissement"
                        fill
                        className="object-contain"
                        sizes="80px"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Building2 className="h-8 w-8" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 w-fit"
                      disabled={uploadingLogo}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      {uploadingLogo ? 'Envoi…' : 'Choisir une image'}
                    </Button>
                    {logo && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-2 w-fit text-destructive hover:text-destructive"
                        onClick={handleRemoveLogo}
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer le logo
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      PNG, JPEG, GIF ou WebP. Max. 2 Mo.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
                <div>
                  <p className="text-sm font-medium">Actif</p>
                  <p className="text-xs text-muted-foreground">L&apos;établissement est actif et visible</p>
                </div>
                <Switch checked={actif} onCheckedChange={setActif} />
              </div>
              <Button onClick={handleSave} disabled={!isDirty || saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
