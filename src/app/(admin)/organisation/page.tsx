'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { DirectionForm } from '@/components/forms/DirectionForm'
import { ServiceForm } from '@/components/forms/ServiceForm'
import { UserForm } from '@/components/forms/UserForm'
import { Globe, Layers, Users, ChevronRight, Edit, Plus, UserMinus, UserCheck, CheckCircle, Ban, ArrowLeft } from 'lucide-react'
import type { DirectionCreateInput, DirectionUpdateInput } from '@/lib/validations/organisation'
import type { ServiceCreateInput, ServiceUpdateInput } from '@/lib/validations/organisation'
import type { UserCreateInput, UserUpdateInput } from '@/lib/validations/organisation'

type DirectionRow = {
  id: number
  nom: string
  code: string
  description: string | null
  actif: boolean
  responsable: { id: number; nom: string; prenom: string; email: string } | null
  _count: { services: number }
}
type ServiceRow = {
  id: number
  nom: string
  code: string
  description: string | null
  actif: boolean
  directionId: number
  direction: { id: number; nom: string; code: string }
  responsable: { id: number; nom: string; prenom: string; email: string } | null
  _count: { employes: number }
}
type UserRow = {
  id: number
  nom: string
  prenom: string
  email: string
  telephone: string | null
  role: string
  actif: boolean
  service: { id: number; nom: string; code: string } | null
  direction: { id: number; nom: string; code: string } | null
  manager: { id: number; nom: string; prenom: string; email: string } | null
}

const TAB_VALUES = ['directions', 'services', 'utilisateurs'] as const
type TabValue = (typeof TAB_VALUES)[number]

function getInitialTab(searchParams: URLSearchParams): TabValue {
  const t = searchParams.get('tab')
  if (t === 'utilisateurs' || t === 'services' || t === 'directions') return t
  return 'utilisateurs'
}

export default function OrganisationPage() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<TabValue>(() => getInitialTab(searchParams))

  const [directions, setDirections] = useState<DirectionRow[]>([])
  const [services, setServices] = useState<ServiceRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [directionActifFilter, setDirectionActifFilter] = useState<string>('all')
  const [serviceDirectionFilter, setServiceDirectionFilter] = useState<string>('all')
  const [serviceActifFilter, setServiceActifFilter] = useState<string>('all')
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all')
  const [userDirectionFilter, setUserDirectionFilter] = useState<string>('all')
  const [userActifFilter, setUserActifFilter] = useState<string>('all')

  const [modal, setModal] = useState<'direction' | 'service' | 'user' | null>(null)
  const [editDirection, setEditDirection] = useState<DirectionRow | null>(null)
  const [editService, setEditService] = useState<ServiceRow | null>(null)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  type ConfirmAction =
    | { kind: 'disable_direction'; direction: DirectionRow }
    | { kind: 'activate_direction'; direction: DirectionRow }
    | { kind: 'disable_service'; service: ServiceRow }
    | { kind: 'activate_service'; service: ServiceRow }
    | { kind: 'disable_user'; user: UserRow }
    | { kind: 'activate_user'; user: UserRow }
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const fetchDirections = useCallback(async () => {
    const params = new URLSearchParams()
    if (directionActifFilter === 'true') params.set('actif', 'true')
    else if (directionActifFilter === 'false') params.set('actif', 'false')
    const url = `/api/organisation/directions${params.toString() ? `?${params.toString()}` : ''}`
    const res = await fetch(url)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? res.statusText, variant: 'destructive' })
      return
    }
    const data = await res.json()
    setDirections(data)
  }, [directionActifFilter])

  const fetchServices = useCallback(async () => {
    const params = new URLSearchParams()
    if (serviceDirectionFilter && serviceDirectionFilter !== 'all') params.set('directionId', serviceDirectionFilter)
    if (serviceActifFilter === 'true') params.set('actif', 'true')
    else if (serviceActifFilter === 'false') params.set('actif', 'false')
    const url = `/api/organisation/services${params.toString() ? `?${params.toString()}` : ''}`
    const res = await fetch(url)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? res.statusText, variant: 'destructive' })
      return
    }
    const data = await res.json()
    setServices(data)
  }, [serviceDirectionFilter, serviceActifFilter])

  const fetchUsers = useCallback(async () => {
    const params = new URLSearchParams()
    if (userRoleFilter && userRoleFilter !== 'all') params.set('role', userRoleFilter)
    if (userDirectionFilter && userDirectionFilter !== 'all') params.set('directionId', userDirectionFilter)
    if (userActifFilter !== '' && userActifFilter !== 'all') params.set('actif', userActifFilter)
    const url = `/api/utilisateurs${params.toString() ? `?${params.toString()}` : ''}`
    const res = await fetch(url)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? res.statusText, variant: 'destructive' })
      return
    }
    const data = await res.json()
    setUsers(data)
  }, [userRoleFilter, userDirectionFilter, userActifFilter])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([fetchDirections(), fetchServices(), fetchUsers()]).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [fetchDirections, fetchServices, fetchUsers])

  const openNewDirection = () => {
    setEditDirection(null)
    setModal('direction')
  }
  const openEditDirection = (row: DirectionRow) => {
    setEditDirection(row)
    setModal('direction')
  }
  const openNewService = () => {
    setEditService(null)
    setModal('service')
  }
  const openEditService = (row: ServiceRow) => {
    setEditService(row)
    setModal('service')
  }
  const openNewUser = () => {
    setEditUser(null)
    setTempPassword(null)
    setModal('user')
  }
  const openEditUser = (row: UserRow) => {
    setEditUser(row)
    setTempPassword(null)
    setModal('user')
  }

  const userOptions = users.map((u) => ({
    id: u.id,
    nom: u.nom,
    prenom: u.prenom,
    email: u.email,
    serviceId: u.service?.id ?? null,
    role: u.role,
  }))
  const directionOptions = directions.map((d) => ({ id: d.id, nom: d.nom, code: d.code }))
  const serviceOptions = services.map((s) => ({ id: s.id, nom: s.nom, code: s.code, directionId: s.directionId }))

  const handleDirectionSubmit = async (values: DirectionCreateInput | DirectionUpdateInput) => {
    if (editDirection) {
      const res = await fetch(`/api/organisation/directions/${editDirection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec mise à jour', variant: 'destructive' })
        return
      }
      toast({ title: 'Direction mise à jour' })
    } else {
      const res = await fetch('/api/organisation/directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec création', variant: 'destructive' })
        return
      }
      toast({ title: 'Direction créée' })
    }
    setModal(null)
    setEditDirection(null)
    fetchDirections()
  }

  const handleServiceSubmit = async (values: ServiceCreateInput | ServiceUpdateInput) => {
    if (editService) {
      const res = await fetch(`/api/organisation/services/${editService.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec mise à jour', variant: 'destructive' })
        return
      }
      toast({ title: 'Service mis à jour' })
    } else {
      const res = await fetch('/api/organisation/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec création', variant: 'destructive' })
        return
      }
      toast({ title: 'Service créé' })
    }
    setModal(null)
    setEditService(null)
    fetchServices()
  }

  const handleUserSubmit = async (values: UserCreateInput | UserUpdateInput) => {
    if (editUser) {
      const res = await fetch(`/api/utilisateurs/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec mise à jour', variant: 'destructive' })
        return
      }
      toast({ title: 'Utilisateur mis à jour' })
    } else {
      const res = await fetch('/api/utilisateurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec création', variant: 'destructive' })
        return
      }
      if (data?.tempPassword) {
        setTempPassword(data.tempPassword)
        toast({ title: 'Utilisateur créé', description: `Mot de passe temporaire : ${data.tempPassword} (à communiquer une seule fois)` })
      } else {
        toast({ title: 'Utilisateur créé' })
      }
    }
    setModal(null)
    setEditUser(null)
    setTempPassword(null)
    fetchUsers()
  }

  const executeConfirmAction = async () => {
    if (!confirmAction) return
    const action = confirmAction
    setConfirmAction(null)

    if (action.kind === 'disable_direction') {
      const res = await fetch(`/api/organisation/directions/${action.direction.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec', variant: 'destructive' })
        return
      }
      toast({ title: 'Direction désactivée' })
      fetchDirections()
    } else if (action.kind === 'activate_direction') {
      const res = await fetch(`/api/organisation/directions/${action.direction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec', variant: 'destructive' })
        return
      }
      toast({ title: 'Direction activée' })
      fetchDirections()
    } else if (action.kind === 'disable_service') {
      const res = await fetch(`/api/organisation/services/${action.service.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec', variant: 'destructive' })
        return
      }
      toast({ title: 'Service désactivé' })
      fetchServices()
    } else if (action.kind === 'activate_service') {
      const res = await fetch(`/api/organisation/services/${action.service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec', variant: 'destructive' })
        return
      }
      toast({ title: 'Service activé' })
      fetchServices()
    } else if (action.kind === 'disable_user') {
      const res = await fetch(`/api/utilisateurs/${action.user.id}/desactiver`, { method: 'PUT' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec', variant: 'destructive' })
        return
      }
      toast({ title: 'Utilisateur désactivé' })
      fetchUsers()
    } else if (action.kind === 'activate_user') {
      const res = await fetch(`/api/utilisateurs/${action.user.id}/activer`, { method: 'PUT' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec', variant: 'destructive' })
        return
      }
      toast({ title: 'Utilisateur activé' })
      fetchUsers()
    }
  }

  const getConfirmDialogContent = (): { title: string; description: string; confirmLabel: string; destructive?: boolean } | null => {
    if (!confirmAction) return null
    switch (confirmAction.kind) {
      case 'disable_direction':
        return {
          title: 'Désactiver la direction',
          description: `Voulez-vous vraiment désactiver la direction « ${confirmAction.direction.nom } » (${confirmAction.direction.code}) ?`,
          confirmLabel: 'Désactiver',
          destructive: true,
        }
      case 'activate_direction':
        return {
          title: 'Activer la direction',
          description: `Voulez-vous réactiver la direction « ${confirmAction.direction.nom } » (${confirmAction.direction.code}) ?`,
          confirmLabel: 'Activer',
        }
      case 'disable_service':
        return {
          title: 'Désactiver le service',
          description: `Voulez-vous vraiment désactiver le service « ${confirmAction.service.nom } » (${confirmAction.service.code}) ?`,
          confirmLabel: 'Désactiver',
          destructive: true,
        }
      case 'activate_service':
        return {
          title: 'Activer le service',
          description: `Voulez-vous réactiver le service « ${confirmAction.service.nom } » (${confirmAction.service.code}) ?`,
          confirmLabel: 'Activer',
        }
      case 'disable_user':
        return {
          title: 'Désactiver l\'utilisateur',
          description: `Voulez-vous vraiment désactiver l'utilisateur « ${confirmAction.user.prenom } ${confirmAction.user.nom } » (${confirmAction.user.email}) ? Il ne pourra plus se connecter.`,
          confirmLabel: 'Désactiver',
          destructive: true,
        }
      case 'activate_user':
        return {
          title: 'Activer l\'utilisateur',
          description: `Voulez-vous réactiver le compte de « ${confirmAction.user.prenom } ${confirmAction.user.nom } » (${confirmAction.user.email}) ?`,
          confirmLabel: 'Activer',
        }
      default:
        return null
    }
  }

  const sectionCards = [
    {
      id: 'directions' as TabValue,
      icon: Globe,
      title: 'Directions',
      description: 'Structure des directions',
      details: 'Gérer les directions, leurs responsables et le nombre de services rattachés.',
      actions: [
        { icon: Plus, label: 'Nouvelle direction', onClick: (e: React.MouseEvent) => { e.stopPropagation(); openNewDirection() } },
      ],
    },
    {
      id: 'services' as TabValue,
      icon: Layers,
      title: 'Services',
      description: 'Services par direction',
      details: 'Créer et modifier les services, les associer à une direction et un responsable.',
      actions: [
        { icon: Plus, label: 'Nouveau service', onClick: (e: React.MouseEvent) => { e.stopPropagation(); openNewService() } },
      ],
    },
    {
      id: 'utilisateurs' as TabValue,
      icon: Users,
      title: 'Utilisateurs',
      description: 'Comptes et rôles',
      details: 'Gérer les utilisateurs, les rôles, affectations et activer ou désactiver les comptes.',
      actions: [
        { icon: Plus, label: 'Nouvel utilisateur', onClick: (e: React.MouseEvent) => { e.stopPropagation(); openNewUser() } },
      ],
    },
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3">
        <Button variant="ghost" size="sm" className="w-fit gap-2 -ml-2" asChild>
          <Link href="/dashboard/admin" title="Retour à la configuration">
            <ArrowLeft className="h-4 w-4" />
            Retour à la configuration
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion de l&apos;organisation</h1>
          <p className="text-muted-foreground mt-1">
            Directions, services et utilisateurs
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sectionCards.map((section) => (
          <Card
            key={section.id}
            className={`group transition-all duration-300 border-border/50 cursor-pointer ${
              tab === section.id
                ? 'ring-2 ring-primary border-primary/30 shadow-md'
                : 'hover:shadow-xl hover:border-primary/20'
            }`}
            onClick={() => setTab(section.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base leading-tight group-hover:text-primary transition-colors">
                      {section.title}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {section.description}
                    </CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {section.details}
              </p>
              <div className="flex gap-2 pt-1">
                {section.actions.map((action, actionIndex) => (
                  <Button
                    key={actionIndex}
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2 text-xs hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={action.onClick}
                  >
                    <action.icon className="h-3.5 w-3.5" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contenu de la section sélectionnée */}
      <div className="space-y-4">
        {tab === 'directions' && (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <Select value={directionActifFilter} onValueChange={setDirectionActifFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="true">Actives</SelectItem>
                  <SelectItem value="false">Inactives</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openNewDirection} className="gap-2">
                <Plus className="h-4 w-4" />
                Nouvelle direction
              </Button>
            </div>
            {loading ? (
              <p className="text-muted-foreground">Chargement...</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {directions.map((d) => (
                  <Card key={d.id} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base font-bold">{d.nom}</CardTitle>
                          {d.description && (
                            <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
                          )}
                          <CardDescription className="text-xs mt-1 inline-block px-2 py-0.5 rounded-md bg-secondary/50">{d.code}</CardDescription>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${d.actif ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                          {d.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <p className="text-xs text-muted-foreground">
                        Responsable : {d.responsable ? `${d.responsable.prenom} ${d.responsable.nom}` : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d._count.services} service{d._count.services !== 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => openEditDirection(d)}>
                          <Edit className="h-3.5 w-3.5" />
                          Éditer
                        </Button>
                        {d.actif ? (
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => setConfirmAction({ kind: 'disable_direction', direction: d })}>
                            <Ban className="h-3.5 w-3.5" />
                            Désactiver
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => setConfirmAction({ kind: 'activate_direction', direction: d })}>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Activer
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'services' && (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <Select value={serviceDirectionFilter} onValueChange={setServiceDirectionFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Toutes les directions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {directions.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={serviceActifFilter} onValueChange={setServiceActifFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="true">Actifs</SelectItem>
                  <SelectItem value="false">Inactifs</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openNewService} className="gap-2">
                <Plus className="h-4 w-4" />
                Nouveau service
              </Button>
            </div>
            {loading ? (
              <p className="text-muted-foreground">Chargement...</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((s) => (
                  <Card key={s.id} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base font-bold">{s.nom}</CardTitle>
                          {s.description && (
                            <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                          )}
                          <CardDescription className="text-xs mt-1 inline-block px-2 py-0.5 rounded-md bg-secondary/50">{s.code}</CardDescription>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.actif ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                          {s.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <p className="text-xs text-muted-foreground">
                        Direction : {s.direction.nom}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Responsable : {s.responsable ? `${s.responsable.prenom} ${s.responsable.nom}` : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s._count.employes} employé{s._count.employes !== 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => openEditService(s)}>
                          <Edit className="h-3.5 w-3.5" />
                          Éditer
                        </Button>
                        {s.actif ? (
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => setConfirmAction({ kind: 'disable_service', service: s })}>
                            <Ban className="h-3.5 w-3.5" />
                            Désactiver
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => setConfirmAction({ kind: 'activate_service', service: s })}>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Activer
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'utilisateurs' && (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="DG">DG</SelectItem>
                  <SelectItem value="DIRECTEUR">Directeur</SelectItem>
                  <SelectItem value="CHEF_SERVICE">Chef de service</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="EMPLOYE">Employé</SelectItem>
                </SelectContent>
              </Select>
              <Select value={userDirectionFilter} onValueChange={setUserDirectionFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {directions.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={userActifFilter} onValueChange={setUserActifFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="true">Actif</SelectItem>
                  <SelectItem value="false">Inactif</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openNewUser} className="gap-2">
                <Plus className="h-4 w-4" />
                Nouvel utilisateur
              </Button>
            </div>
            {loading ? (
              <p className="text-muted-foreground">Chargement...</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {users.map((u) => (
                  <Card key={u.id} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base font-bold">{u.prenom} {u.nom}</CardTitle>
                          <CardDescription className="text-xs truncate">{u.email}</CardDescription>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${u.actif ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                          {u.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <p className="text-xs text-muted-foreground">
                        Rôle : {u.role}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {u.service ? u.service.nom : u.direction ? u.direction.nom : '—'}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => openEditUser(u)}>
                          <Edit className="h-3.5 w-3.5" />
                          Éditer
                        </Button>
                        {u.actif ? (
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => setConfirmAction({ kind: 'disable_user', user: u })}>
                            <UserMinus className="h-3.5 w-3.5" />
                            Désactiver
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => setConfirmAction({ kind: 'activate_user', user: u })}>
                            <UserCheck className="h-3.5 w-3.5" />
                            Activer
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={modal === 'direction'} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDirection ? 'Modifier la direction' : 'Nouvelle direction'}</DialogTitle>
          </DialogHeader>
          <DirectionForm
            defaultValues={editDirection ? { nom: editDirection.nom, code: editDirection.code, description: editDirection.description ?? '', responsableId: editDirection.responsable?.id } : undefined}
            users={users.map((u) => ({ id: u.id, nom: u.nom, prenom: u.prenom, email: u.email }))}
            onSubmit={handleDirectionSubmit}
            isEdit={!!editDirection}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'service'} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editService ? 'Modifier le service' : 'Nouveau service'}</DialogTitle>
          </DialogHeader>
          <ServiceForm
            defaultValues={editService ? { nom: editService.nom, code: editService.code, description: editService.description ?? '', directionId: editService.directionId, responsableId: editService.responsable?.id } : undefined}
            directions={directionOptions}
            users={users.map((u) => ({ id: u.id, nom: u.nom, prenom: u.prenom, email: u.email }))}
            onSubmit={handleServiceSubmit}
            isEdit={!!editService}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'user'} onOpenChange={(open) => !open && (setModal(null), setTempPassword(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</DialogTitle>
            {tempPassword && (
              <p className="text-sm text-amber-600">Mot de passe temporaire : {tempPassword}</p>
            )}
          </DialogHeader>
          <UserForm
            defaultValues={editUser ? { nom: editUser.nom, prenom: editUser.prenom, email: editUser.email, telephone: editUser.telephone ?? '', role: editUser.role as UserCreateInput['role'], directionId: editUser.direction?.id ?? undefined, serviceId: editUser.service?.id ?? undefined, managerId: editUser.manager?.id } : undefined}
            directions={directionOptions}
            services={serviceOptions}
            users={userOptions}
            onSubmit={handleUserSubmit}
            isEdit={!!editUser}
          />
        </DialogContent>
      </Dialog>

      {(() => {
        const confirmContent = getConfirmDialogContent()
        return (
          <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
            <AlertDialogContent>
              {confirmContent && (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{confirmContent.title}</AlertDialogTitle>
                    <AlertDialogDescription>{confirmContent.description}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={executeConfirmAction}
                      className={confirmContent.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
                    >
                      {confirmContent.confirmLabel}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </>
              )}
            </AlertDialogContent>
          </AlertDialog>
        )
      })()}
    </div>
  )
}
