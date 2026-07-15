'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import type { DirectionCreateInput, DirectionUpdateInput } from '@/lib/validations/organisation'
import type { ServiceCreateInput, ServiceUpdateInput } from '@/lib/validations/organisation'
import type { UserCreateInput, UserUpdateInput } from '@/lib/validations/organisation'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ROLE_OPTIONS, classerCarteUtilisateur, libellerRole } from '@/lib/role-labels'
import { cn } from '@/lib/utils'
import { Globe, Layers, Users, ChevronRight, Pencil, Plus, UserMinus, UserCheck, Trash2, CheckCircle, Ban, ArrowLeft, Copy, Check, Search, ChevronLeft, Eye, Mail, type LucideIcon } from 'lucide-react'

type DirectionRow = {
  id: number
  nom: string
  code: string
  description: string | null
  actif: boolean
  directeurTitulaire: { id: number; nom: string; prenom: string; email: string } | null
  _count: { services: number; catalogueKpis: number; users: number }
}
type ServiceRow = {
  id: number
  nom: string
  code: string
  description: string | null
  actif: boolean
  directionId: number
  direction: { id: number; nom: string; code: string }
  chefService: { id: number; nom: string; prenom: string; email: string } | null
  _count: { employes: number }
}
type UserRow = {
  id: number
  nom: string
  prenom: string
  email: string
  telephone: string | null
  posteOccupe: string | null
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

function IconActionButton({
  label,
  icon: Icon,
  onClick,
  href,
  variant = 'default',
}: {
  label: string
  icon: LucideIcon
  onClick?: () => void
  href?: string
  variant?: 'default' | 'destructive' | 'success'
}) {
  const className = cn(
    'h-8 w-8 shrink-0',
    variant === 'destructive' && 'text-muted-foreground hover:text-destructive',
    variant === 'success' && 'text-muted-foreground hover:text-green-600',
  )
  const content = <Icon className="h-4 w-4" />
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href ? (
          <Button variant="ghost" size="icon" className={className} asChild>
            <Link href={href}>{content}</Link>
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className={className} onClick={onClick}>
            {content}
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground sm:w-36 shrink-0">{label}</dt>
      <dd className="text-sm">{value ?? '—'}</dd>
    </div>
  )
}

function CardInfoRow({
  label,
  value,
  labelClassName = 'text-foreground/60',
  valueClassName = 'text-foreground/85',
  stacked = false,
  valueAsBadge = false,
  badgeClassName = 'bg-primary/10 text-primary',
}: {
  label: string
  value: React.ReactNode
  labelClassName?: string
  valueClassName?: string
  stacked?: boolean
  valueAsBadge?: boolean
  badgeClassName?: string
}) {
  const valueEl = valueAsBadge ? (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${badgeClassName}`}>
      {value ?? '—'}
    </span>
  ) : (
    <span className={valueClassName}>{value ?? '—'}</span>
  )

  if (stacked) {
    return (
      <div className="text-xs leading-relaxed">
        <p className={`font-semibold ${labelClassName}`}>{label} :</p>
        <div className={`mt-0.5 break-words ${valueAsBadge ? '' : valueClassName}`}>{valueEl}</div>
      </div>
    )
  }
  return (
    <p className="text-xs leading-relaxed break-words">
      <span className={`font-semibold ${labelClassName}`}>{label} :</span>{' '}
      {valueEl}
    </p>
  )
}

export default function OrganisationPage() {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<TabValue>(() => getInitialTab(searchParams))

  const [directions, setDirections] = useState<DirectionRow[]>([])
  const [services, setServices] = useState<ServiceRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersForSelect, setUsersForSelect] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [directionActifFilter, setDirectionActifFilter] = useState<string>('all')
  const [directionSearchQuery, setDirectionSearchQuery] = useState('')
  const [serviceDirectionFilter, setServiceDirectionFilter] = useState<string>('all')
  const [serviceActifFilter, setServiceActifFilter] = useState<string>('all')
  const [serviceSearchQuery, setServiceSearchQuery] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all')
  const [userDirectionFilter, setUserDirectionFilter] = useState<string>('all')
  const [userActifFilter, setUserActifFilter] = useState<string>('all')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [userTotal, setUserTotal] = useState(0)
  const USER_PAGE_SIZE = 12

  const [modal, setModal] = useState<'direction' | 'service' | 'user' | null>(null)
  const [editService, setEditService] = useState<ServiceRow | null>(null)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [newUserCredentials, setNewUserCredentials] = useState<{ email: string; tempPassword: string } | null>(null)
  const [passwordCopied, setPasswordCopied] = useState(false)

  type ConfirmAction =
    | { kind: 'disable_direction'; direction: DirectionRow }
    | { kind: 'activate_direction'; direction: DirectionRow }
    | { kind: 'delete_direction'; direction: DirectionRow }
    | { kind: 'disable_service'; service: ServiceRow }
    | { kind: 'activate_service'; service: ServiceRow }
    | { kind: 'delete_service'; service: ServiceRow }
    | { kind: 'disable_user'; user: UserRow }
    | { kind: 'activate_user'; user: UserRow }
    | { kind: 'delete_user'; user: UserRow }
    | { kind: 'resend_password_user'; user: UserRow }
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [viewTarget, setViewTarget] = useState<
    | { kind: 'service'; data: ServiceRow }
    | { kind: 'user'; data: UserRow }
    | null
  >(null)

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
    if (userSearchQuery.trim()) params.set('search', userSearchQuery.trim())
    params.set('page', String(userPage))
    params.set('pageSize', String(USER_PAGE_SIZE))
    const url = `/api/utilisateurs?${params.toString()}`
    const res = await fetch(url)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: 'Erreur', description: data?.error ?? res.statusText, variant: 'destructive' })
      return
    }
    const data = await res.json()
    setUsers(data.list ?? [])
    setUserTotal(data.total ?? 0)
  }, [userRoleFilter, userDirectionFilter, userActifFilter, userSearchQuery, userPage])

  const fetchUsersForSelect = useCallback(async () => {
    const res = await fetch('/api/utilisateurs?pageSize=500')
    if (!res.ok) return
    const data = await res.json()
    setUsersForSelect(data.list ?? [])
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([fetchDirections(), fetchServices(), fetchUsers(), fetchUsersForSelect()]).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [fetchDirections, fetchServices, fetchUsers, fetchUsersForSelect])

  const openNewDirection = () => {
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

  const userOptions = (usersForSelect.length > 0 ? usersForSelect : users).map((u) => ({
    id: u.id,
    nom: u.nom,
    prenom: u.prenom,
    email: u.email,
    serviceId: u.service?.id ?? null,
    role: u.role,
  }))
  const directionOptions = directions.map((d) => ({ id: d.id, nom: d.nom, code: d.code }))
  const serviceOptions = services.map((s) => ({ id: s.id, nom: s.nom, code: s.code, directionId: s.directionId }))

  const directionsFiltrees = useMemo(() => {
    const q = directionSearchQuery
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
    if (!q) return directions
    return directions.filter((d) => {
      const hay = [d.nom, d.code, d.description ?? '']
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
      return hay.includes(q)
    })
  }, [directions, directionSearchQuery])

  const servicesFiltres = useMemo(() => {
    const q = serviceSearchQuery
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
    if (!q) return services
    return services.filter((s) => {
      const hay = [s.nom, s.code, s.description ?? '', s.direction.nom, s.direction.code]
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
      return hay.includes(q)
    })
  }, [services, serviceSearchQuery])

  const handleDirectionSubmit = async (values: DirectionCreateInput | DirectionUpdateInput) => {
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
    setModal(null)
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
      toast({ title: 'Département / agence mis à jour' })
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
      toast({ title: 'Département / agence créé' })
    }
    setModal(null)
    setEditService(null)
    fetchServices()
  }

  const handleUserSubmit = async (values: UserCreateInput | UserUpdateInput) => {
    if (editUser) {
      const payload = { ...values } as UserUpdateInput
      if (!payload.password?.trim()) delete payload.password

      const res = await fetch(`/api/utilisateurs/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const details = data?.details?.fieldErrors
          ? Object.entries(data.details.fieldErrors as Record<string, string[]>)
              .flatMap(([k, v]) => v.map((m) => `${k}: ${m}`))
              .join(' · ')
          : null
        toast({
          title: 'Erreur',
          description: details || data?.error || (typeof data?.details === 'string' ? data.details : null) || 'Échec mise à jour',
          variant: 'destructive',
        })
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
        setNewUserCredentials({ email: values.email.trim().toLowerCase(), tempPassword: data.tempPassword })
        toast({ title: 'Utilisateur créé', description: 'Les identifiants sont affichés ci-dessous. Copiez-les avant de fermer.' })
      } else {
        toast({ title: 'Utilisateur créé' })
      }
    }
    setModal(null)
    setEditUser(null)
    setTempPassword(null)
    fetchUsers()
    fetchUsersForSelect()
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
    } else if (action.kind === 'delete_direction') {
      const res = await fetch(`/api/organisation/directions/${action.direction.id}/supprimer`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec', variant: 'destructive' })
        return
      }
      toast({ title: 'Direction supprimée' })
      fetchDirections()
      fetchServices()
    } else if (action.kind === 'disable_service') {
      const res = await fetch(`/api/organisation/services/${action.service.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec', variant: 'destructive' })
        return
      }
      toast({ title: 'Département / agence désactivé' })
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
      toast({ title: 'Département / agence activé' })
      fetchServices()
    } else if (action.kind === 'delete_service') {
      const res = await fetch(`/api/organisation/services/${action.service.id}/supprimer`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec', variant: 'destructive' })
        return
      }
      toast({ title: 'Département / agence supprimé' })
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
      fetchUsersForSelect()
    } else if (action.kind === 'activate_user') {
      const res = await fetch(`/api/utilisateurs/${action.user.id}/activer`, { method: 'PUT' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec', variant: 'destructive' })
        return
      }
      toast({ title: 'Utilisateur activé' })
      fetchUsers()
      fetchUsersForSelect()
    } else if (action.kind === 'delete_user') {
      const res = await fetch(`/api/utilisateurs/${action.user.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec', variant: 'destructive' })
        return
      }
      toast({ title: 'Utilisateur supprimé' })
      fetchUsers()
      fetchUsersForSelect()
    } else if (action.kind === 'resend_password_user') {
      const res = await fetch(`/api/utilisateurs/${action.user.id}/renvoyer-mot-de-passe`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: 'Erreur', description: data?.error ?? 'Échec de l\'envoi', variant: 'destructive' })
        return
      }
      toast({
        title: 'Mot de passe envoyé',
        description: data?.message ?? `Un nouveau mot de passe a été envoyé à ${action.user.email}.`,
      })
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
      case 'delete_direction':
        return {
          title: 'Supprimer la direction',
          description: `Voulez-vous vraiment supprimer définitivement la direction « ${confirmAction.direction.nom } » (${confirmAction.direction.code}) ? Les départements/agences associés seront également supprimés. Cette action est irréversible.`,
          confirmLabel: 'Supprimer',
          destructive: true,
        }
      case 'disable_service':
        return {
          title: 'Désactiver le département / agence',
          description: `Voulez-vous vraiment désactiver « ${confirmAction.service.nom } » (${confirmAction.service.code}) ?`,
          confirmLabel: 'Désactiver',
          destructive: true,
        }
      case 'activate_service':
        return {
          title: 'Activer le département / agence',
          description: `Voulez-vous réactiver « ${confirmAction.service.nom } » (${confirmAction.service.code}) ?`,
          confirmLabel: 'Activer',
        }
      case 'delete_service':
        return {
          title: 'Supprimer le département / agence',
          description: `Voulez-vous vraiment supprimer définitivement « ${confirmAction.service.nom } » (${confirmAction.service.code}) ? Les KPI et données associés seront supprimés. Cette action est irréversible.`,
          confirmLabel: 'Supprimer',
          destructive: true,
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
      case 'delete_user':
        return {
          title: 'Supprimer l\'utilisateur',
          description: `Voulez-vous vraiment supprimer définitivement « ${confirmAction.user.prenom } ${confirmAction.user.nom } » (${confirmAction.user.email}) ? Cette action est irréversible.`,
          confirmLabel: 'Supprimer',
          destructive: true,
        }
      case 'resend_password_user': {
        const nomComplet = [confirmAction.user.prenom, confirmAction.user.nom].filter(Boolean).join(' ') || confirmAction.user.email
        return {
          title: 'Renvoyer le mot de passe',
          description: `Un nouveau mot de passe temporaire sera généré et envoyé par email à « ${nomComplet} » (${confirmAction.user.email}). L'ancien mot de passe ne sera plus valide.`,
          confirmLabel: 'Envoyer par email',
        }
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
      details: 'Gérer les directions, leurs responsables, départements/agences, KPI et utilisateurs.',
      cardClass: 'bg-sky-50/90 dark:bg-sky-950/25 border-sky-200/70 dark:border-sky-800/50',
      iconClass: 'text-sky-700 dark:text-sky-400',
      iconBgClass: 'bg-sky-100 dark:bg-sky-900/50',
      actions: [
        { icon: Plus, label: 'Nouvelle direction', onClick: (e: React.MouseEvent) => { e.stopPropagation(); openNewDirection() } },
      ],
    },
    {
      id: 'services' as TabValue,
      icon: Layers,
      title: 'Département / Agence',
      description: 'Départements et agences par direction',
      details: 'Créer et modifier les départements ou agences, les associer à une direction et un responsable.',
      cardClass: 'bg-violet-50/90 dark:bg-violet-950/25 border-violet-200/70 dark:border-violet-800/50',
      iconClass: 'text-violet-700 dark:text-violet-400',
      iconBgClass: 'bg-violet-100 dark:bg-violet-900/50',
      actions: [
        { icon: Plus, label: 'Nouveau département / agence', onClick: (e: React.MouseEvent) => { e.stopPropagation(); openNewService() } },
      ],
    },
    {
      id: 'utilisateurs' as TabValue,
      icon: Users,
      title: 'Utilisateurs',
      description: 'Comptes et rôles',
      details: 'Gérer les utilisateurs, les rôles, affectations et activer ou désactiver les comptes.',
      cardClass: 'bg-emerald-50/90 dark:bg-emerald-950/25 border-emerald-200/70 dark:border-emerald-800/50',
      iconClass: 'text-emerald-700 dark:text-emerald-400',
      iconBgClass: 'bg-emerald-100 dark:bg-emerald-900/50',
      actions: [
        { icon: Plus, label: 'Nouvel utilisateur', onClick: (e: React.MouseEvent) => { e.stopPropagation(); openNewUser() } },
      ],
    },
  ]

  return (
    <TooltipProvider>
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
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestion de l&apos;organisation</h1>
            <p className="text-muted-foreground mt-0.5">
              Directions, départements/agences et utilisateurs
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sectionCards.map((section) => (
          <Card
            key={section.id}
            className={`group transition-all duration-300 cursor-pointer ${section.cardClass} ${
              tab === section.id
                ? 'ring-2 ring-primary shadow-md'
                : 'hover:shadow-xl hover:brightness-[0.98] dark:hover:brightness-110'
            }`}
            onClick={() => setTab(section.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${section.iconBgClass}`}>
                    <section.icon className={`h-5 w-5 ${section.iconClass}`} />
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
              <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Rechercher une direction…"
                  value={directionSearchQuery}
                  onChange={(e) => setDirectionSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
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
            ) : directionsFiltrees.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                {directionSearchQuery.trim()
                  ? 'Aucune direction ne correspond à cette recherche.'
                  : 'Aucune direction.'}
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {directionsFiltrees.map((d) => (
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
                        Directeur titulaire :{' '}
                        {d.directeurTitulaire
                          ? `${d.directeurTitulaire.prenom} ${d.directeurTitulaire.nom}`.trim()
                          : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d._count.services} département{d._count.services !== 1 ? 's' : ''}
                        {' · '}
                        {d._count.catalogueKpis ?? 0} KPI
                        {' · '}
                        {d._count.users ?? 0} utilisateur{(d._count.users ?? 0) !== 1 ? 's' : ''}
                      </p>
                      <div className="flex items-center gap-0.5 pt-2">
                        <IconActionButton
                          label="Consulter"
                          icon={Eye}
                          href={`/organisation/directions/${d.id}`}
                        />
                        <IconActionButton
                          label="Éditer"
                          icon={Pencil}
                          href={`/organisation/directions/${d.id}/edit`}
                        />
                        {d.actif ? (
                          <IconActionButton
                            label="Désactiver"
                            icon={Ban}
                            variant="destructive"
                            onClick={() => setConfirmAction({ kind: 'disable_direction', direction: d })}
                          />
                        ) : (
                          <IconActionButton
                            label="Activer"
                            icon={CheckCircle}
                            variant="success"
                            onClick={() => setConfirmAction({ kind: 'activate_direction', direction: d })}
                          />
                        )}
                        <IconActionButton
                          label="Supprimer"
                          icon={Trash2}
                          variant="destructive"
                          onClick={() => setConfirmAction({ kind: 'delete_direction', direction: d })}
                        />
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
              <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Rechercher un département ou agence…"
                  value={serviceSearchQuery}
                  onChange={(e) => setServiceSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
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
                Nouveau département / agence
              </Button>
            </div>
            {loading ? (
              <p className="text-muted-foreground">Chargement...</p>
            ) : servicesFiltres.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                {serviceSearchQuery.trim()
                  ? 'Aucun département / agence ne correspond à cette recherche.'
                  : 'Aucun département / agence.'}
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {servicesFiltres.map((s) => (
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
                        Chef département / agence :{' '}
                        {s.chefService
                          ? `${s.chefService.prenom} ${s.chefService.nom}`.trim()
                          : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s._count.employes} employé{s._count.employes !== 1 ? 's' : ''}
                      </p>
                      <div className="flex items-center gap-0.5 pt-2">
                        <IconActionButton
                          label="Consulter"
                          icon={Eye}
                          onClick={() => setViewTarget({ kind: 'service', data: s })}
                        />
                        <IconActionButton
                          label="Éditer"
                          icon={Pencil}
                          onClick={() => openEditService(s)}
                        />
                        {s.actif ? (
                          <IconActionButton
                            label="Désactiver"
                            icon={Ban}
                            variant="destructive"
                            onClick={() => setConfirmAction({ kind: 'disable_service', service: s })}
                          />
                        ) : (
                          <IconActionButton
                            label="Activer"
                            icon={CheckCircle}
                            variant="success"
                            onClick={() => setConfirmAction({ kind: 'activate_service', service: s })}
                          />
                        )}
                        <IconActionButton
                          label="Supprimer"
                          icon={Trash2}
                          variant="destructive"
                          onClick={() => setConfirmAction({ kind: 'delete_service', service: s })}
                        />
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
              <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Rechercher par nom, prénom ou email..."
                  value={userSearchQuery}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value)
                    setUserPage(1)
                  }}
                  className="pl-9 h-9"
                />
              </div>
              <Select
                value={userRoleFilter}
                onValueChange={(v) => {
                  setUserRoleFilter(v)
                  setUserPage(1)
                }}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={userDirectionFilter}
                onValueChange={(v) => {
                  setUserDirectionFilter(v)
                  setUserPage(1)
                }}
              >
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="Direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {directions.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={userActifFilter}
                onValueChange={(v) => {
                  setUserActifFilter(v)
                  setUserPage(1)
                }}
              >
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="true">Actif</SelectItem>
                  <SelectItem value="false">Inactif</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openNewUser} className="gap-2 h-9">
                <Plus className="h-4 w-4" />
                Nouvel utilisateur
              </Button>
            </div>
            {loading ? (
              <p className="text-muted-foreground">Chargement...</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {users.map((u) => (
                  <Card key={u.id} className={`group gap-0 hover:shadow-lg transition-all duration-300 ${classerCarteUtilisateur(u.role)}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base font-bold leading-snug">{[u.prenom, u.nom].filter(Boolean).join(' ')}</CardTitle>
                          {u.posteOccupe?.trim() && (
                            <p className="text-xs text-black dark:text-neutral-100 leading-relaxed break-words mt-1">
                              {u.posteOccupe.trim()}
                            </p>
                          )}
                          <CardDescription className="text-xs mt-1 break-all">{u.email}</CardDescription>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${u.actif ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                          {u.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 border-t border-border/50 pt-2">
                      <dl className="space-y-2">
                        <CardInfoRow
                          label="Rôle"
                          value={libellerRole(u.role)}
                          labelClassName="text-gray-700 dark:text-gray-300"
                          valueAsBadge
                          badgeClassName="bg-primary/10 text-primary"
                        />
                        <CardInfoRow
                          label={u.service ? 'Département / Agence' : 'Direction'}
                          value={
                            u.service
                              ? u.service.nom.trim()
                              : u.direction?.nom?.trim() ?? '—'
                          }
                          stacked={!!u.service}
                          labelClassName="text-indigo-700/85 dark:text-indigo-400/90"
                          valueClassName="text-indigo-950/85 dark:text-indigo-100/90 font-medium"
                        />
                      </dl>
                      <div className="flex items-center gap-0.5 border-t border-border/50 pt-2">
                        <IconActionButton
                          label="Consulter"
                          icon={Eye}
                          onClick={() => setViewTarget({ kind: 'user', data: u })}
                        />
                        <IconActionButton
                          label="Éditer"
                          icon={Pencil}
                          onClick={() => openEditUser(u)}
                        />
                        {u.actif && (
                          <IconActionButton
                            label="Renvoyer le mot de passe par email"
                            icon={Mail}
                            onClick={() => setConfirmAction({ kind: 'resend_password_user', user: u })}
                          />
                        )}
                        {u.actif ? (
                          <IconActionButton
                            label="Désactiver"
                            icon={UserMinus}
                            variant="destructive"
                            onClick={() => setConfirmAction({ kind: 'disable_user', user: u })}
                          />
                        ) : (
                          <IconActionButton
                            label="Activer"
                            icon={UserCheck}
                            variant="success"
                            onClick={() => setConfirmAction({ kind: 'activate_user', user: u })}
                          />
                        )}
                        <IconActionButton
                          label="Supprimer"
                          icon={Trash2}
                          variant="destructive"
                          onClick={() => setConfirmAction({ kind: 'delete_user', user: u })}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
                </div>
                {userTotal > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/50">
                    <p className="text-sm text-muted-foreground">
                      {userTotal} utilisateur{userTotal !== 1 ? 's' : ''} au total
                      {userSearchQuery.trim() && ` pour « ${userSearchQuery.trim()} »`}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={userPage <= 1}
                        onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Précédent
                      </Button>
                      <span className="text-sm text-muted-foreground px-2">
                        Page {userPage} sur {Math.max(1, Math.ceil(userTotal / USER_PAGE_SIZE))}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        disabled={userPage >= Math.ceil(userTotal / USER_PAGE_SIZE)}
                        onClick={() => setUserPage((p) => p + 1)}
                      >
                        Suivant
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <Dialog open={!!viewTarget} onOpenChange={(open) => !open && setViewTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {viewTarget?.kind === 'service' && 'Détail du département / agence'}
              {viewTarget?.kind === 'user' && 'Détail de l\'utilisateur'}
            </DialogTitle>
          </DialogHeader>
          {viewTarget?.kind === 'service' && (
            <dl className="space-y-3 py-2">
              <DetailRow label="Nom" value={viewTarget.data.nom} />
              <DetailRow label="Code" value={viewTarget.data.code} />
              <DetailRow label="Description" value={viewTarget.data.description || '—'} />
              <DetailRow label="Direction" value={`${viewTarget.data.direction.nom} (${viewTarget.data.direction.code})`} />
              <DetailRow
                label="Chef département / agence"
                value={
                  viewTarget.data.chefService
                    ? `${viewTarget.data.chefService.prenom} ${viewTarget.data.chefService.nom} (${viewTarget.data.chefService.email})`
                    : '—'
                }
              />
              <DetailRow
                label="Employés"
                value={`${viewTarget.data._count.employes} employé${viewTarget.data._count.employes !== 1 ? 's' : ''}`}
              />
              <DetailRow
                label="Statut"
                value={
                  <span className={`inline-flex text-xs px-2 py-0.5 rounded-full ${viewTarget.data.actif ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                    {viewTarget.data.actif ? 'Actif' : 'Inactif'}
                  </span>
                }
              />
            </dl>
          )}
          {viewTarget?.kind === 'user' && (
            <dl className="space-y-3 py-2">
              <DetailRow label="Nom complet" value={[viewTarget.data.prenom, viewTarget.data.nom].filter(Boolean).join(' ') || '—'} />
              <DetailRow label="Email" value={viewTarget.data.email} />
              <DetailRow label="Téléphone" value={viewTarget.data.telephone || '—'} />
              <DetailRow label="Fonction" value={viewTarget.data.posteOccupe?.trim() || '—'} />
              <DetailRow label="Rôle" value={libellerRole(viewTarget.data.role)} />
              <DetailRow
                label="Direction"
                value={viewTarget.data.direction ? `${viewTarget.data.direction.nom} (${viewTarget.data.direction.code})` : '—'}
              />
              <DetailRow
                label="Département / Agence"
                value={viewTarget.data.service ? `${viewTarget.data.service.nom} (${viewTarget.data.service.code})` : '—'}
              />
              <DetailRow
                label="Manager"
                value={
                  viewTarget.data.manager
                    ? `${viewTarget.data.manager.prenom} ${viewTarget.data.manager.nom} (${viewTarget.data.manager.email})`
                    : '—'
                }
              />
              <DetailRow
                label="Statut"
                value={
                  <span className={`inline-flex text-xs px-2 py-0.5 rounded-full ${viewTarget.data.actif ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                    {viewTarget.data.actif ? 'Actif' : 'Inactif'}
                  </span>
                }
              />
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'direction'} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle direction</DialogTitle>
          </DialogHeader>
          <DirectionForm onSubmit={handleDirectionSubmit} />
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'service'} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editService ? 'Modifier le département / agence' : 'Nouveau département / agence'}</DialogTitle>
          </DialogHeader>
          <ServiceForm
            defaultValues={editService ? { nom: editService.nom, code: editService.code, description: editService.description ?? '', directionId: editService.directionId } : undefined}
            directions={directionOptions}
            chefService={editService?.chefService ?? null}
            onSubmit={handleServiceSubmit}
            isEdit={!!editService}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={modal === 'user'} onOpenChange={(open) => !open && (setModal(null), setTempPassword(null))}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</DialogTitle>
          </DialogHeader>
          <UserForm
            defaultValues={editUser ? {
              nom: editUser.nom,
              prenom: editUser.prenom,
              email: editUser.email,
              telephone: editUser.telephone ?? '',
              posteOccupe: editUser.posteOccupe ?? '',
              role: editUser.role as UserCreateInput['role'],
              directionId: editUser.service ? undefined : (editUser.direction?.id ?? undefined),
              serviceId: editUser.service?.id ?? undefined,
              managerId: editUser.manager?.id,
            } : undefined}
            directions={directionOptions}
            services={serviceOptions}
            users={userOptions}
            onSubmit={handleUserSubmit}
            isEdit={!!editUser}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!newUserCredentials} onOpenChange={(open) => !open && (setNewUserCredentials(null), setPasswordCopied(false))}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Identifiants de connexion</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Communiquez ces identifiants au nouvel utilisateur. Un email lui a également été envoyé.
            </p>
          </DialogHeader>
          {newUserCredentials && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={newUserCredentials.email}
                    className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(newUserCredentials.email)
                      toast({ title: 'Email copié' })
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mot de passe temporaire</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={newUserCredentials.tempPassword}
                    className="flex h-10 w-full rounded-md border border-input bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-sm font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(newUserCredentials.tempPassword)
                      setPasswordCopied(true)
                      toast({ title: 'Mot de passe copié' })
                      setTimeout(() => setPasswordCopied(false), 2000)
                    }}
                  >
                    {passwordCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button onClick={() => setNewUserCredentials(null)} className="w-full">
                J&apos;ai noté les identifiants, fermer
              </Button>
            </div>
          )}
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
    </TooltipProvider>
  )
}
