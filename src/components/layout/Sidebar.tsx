'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useEtablissement } from '@/contexts/etablissement-context'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  Settings,
  Target,
  BarChart3,
  UserCheck,
  Send,
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  History,
  X,
  Calendar,
} from 'lucide-react'
import { ROLE_LABELS } from '@/lib/role-labels'

type NavLink = {
  type: 'link'
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  countKey?: 'saisiesAValider'
}
type NavGroup = { type: 'group'; label: string }
type NavEntry = NavLink | NavGroup

function getActiveHref(pathname: string, links: NavLink[]): string | null {
  const matches = links.filter(
    (l) => pathname === l.href || pathname.startsWith(`${l.href}/`)
  )
  if (matches.length === 0) return null
  return matches.sort((a, b) => b.href.length - a.href.length)[0].href
}

function getNavForRole(role: string): NavEntry[] {
  const dashboardHref = role === 'DG' ? '/dashboard/dg'
    : role === 'DIRECTEUR' ? '/dashboard/directeur'
    : role === 'CHEF_SERVICE' ? '/dashboard/chef-service'
    : role === 'MANAGER' ? '/dashboard/manager'
    : '/dashboard/employe'

  switch (role) {
    case 'DG':
      return [
        { type: 'link', name: 'Tableau de bord', href: dashboardHref, icon: LayoutDashboard },
        { type: 'group', label: 'Paramétrage' },
        { type: 'link', name: 'KPI des directions', href: '/directeur/kpi-direction', icon: Building2 },
        { type: 'link', name: "Périodes d'évaluation", href: '/admin/periodes', icon: Calendar },
        { type: 'link', name: 'Configuration de base', href: '/dashboard/admin', icon: Settings },
        { type: 'group', label: 'Suivi opérationnel' },
        { type: 'link', name: 'Saisie KPI direction', href: '/directeur/saisie', icon: ClipboardList },
        { type: 'link', name: 'Assignations', href: '/manager/assignation', icon: Send },
        { type: 'link', name: 'Valider saisies', href: '/manager/validation', icon: CheckCircle2, countKey: 'saisiesAValider' },
        { type: 'link', name: 'Mon équipe', href: '/manager/equipe', icon: UserCheck },
        { type: 'link', name: 'Contestations', href: '/manager/assignation/contestations', icon: AlertCircle },
      ]
    case 'DIRECTEUR':
      return [
        { type: 'link', name: 'Tableau de bord', href: dashboardHref, icon: LayoutDashboard },
        { type: 'group', label: 'Mes objectifs' },
        { type: 'link', name: 'Mes KPI personnels', href: '/employe/mes-kpi', icon: Target },
        { type: 'link', name: 'Ma saisie mensuelle', href: '/saisie', icon: ClipboardList },
        { type: 'link', name: 'Mon historique', href: '/employe/historique', icon: History },
        { type: 'group', label: 'Ma direction' },
        { type: 'link', name: 'KPI de la direction', href: '/directeur/kpi-direction', icon: Building2 },
        { type: 'link', name: 'Saisie KPI direction', href: '/directeur/saisie', icon: ClipboardList },
        { type: 'link', name: 'Services & départements', href: '/directeur/services', icon: Building2 },
        { type: 'group', label: 'Mon équipe' },
        { type: 'link', name: 'Valider saisies', href: '/manager/validation', icon: CheckCircle2, countKey: 'saisiesAValider' },
        { type: 'link', name: 'Mon équipe', href: '/manager/equipe', icon: UserCheck },
        { type: 'link', name: 'Assignations', href: '/manager/assignation', icon: Send },
        { type: 'link', name: 'Contestations', href: '/manager/assignation/contestations', icon: AlertCircle },
        { type: 'group', label: 'Analyse' },
        { type: 'link', name: 'Rapports', href: '/directeur/rapports', icon: BarChart3 },
      ]
    case 'CHEF_SERVICE':
      return [
        { type: 'link', name: 'Tableau de bord', href: dashboardHref, icon: LayoutDashboard },
        { type: 'group', label: 'Mes objectifs' },
        { type: 'link', name: 'Mes KPI personnels', href: '/employe/mes-kpi', icon: Target },
        { type: 'link', name: 'Ma saisie mensuelle', href: '/saisie', icon: ClipboardList },
        { type: 'link', name: 'Mon historique', href: '/employe/historique', icon: History },
        { type: 'group', label: 'Mon service' },
        { type: 'link', name: 'KPI du service', href: '/chef-service/kpi-service', icon: Target },
        { type: 'link', name: 'Mon équipe', href: '/chef-service/mon-equipe', icon: UserCheck },
        { type: 'group', label: 'Suivi équipe' },
        { type: 'link', name: 'Valider saisies', href: '/manager/validation', icon: CheckCircle2, countKey: 'saisiesAValider' },
        { type: 'link', name: 'Assignations', href: '/manager/assignation', icon: Send },
        { type: 'link', name: 'Contestations', href: '/manager/assignation/contestations', icon: AlertCircle },
      ]
    case 'MANAGER':
      return [
        { type: 'link', name: 'Tableau de bord', href: dashboardHref, icon: LayoutDashboard },
        { type: 'group', label: 'Mes objectifs' },
        { type: 'link', name: 'Mes KPI personnels', href: '/employe/mes-kpi', icon: Target },
        { type: 'link', name: 'Ma saisie mensuelle', href: '/saisie', icon: ClipboardList },
        { type: 'link', name: 'Mon historique', href: '/employe/historique', icon: History },
        { type: 'group', label: 'Mon équipe' },
        { type: 'link', name: 'Assignations', href: '/manager/assignation', icon: Send },
        { type: 'link', name: 'Valider saisies', href: '/manager/validation', icon: CheckCircle2, countKey: 'saisiesAValider' },
        { type: 'link', name: 'Mon équipe', href: '/manager/equipe', icon: UserCheck },
        { type: 'link', name: 'Contestations', href: '/manager/assignation/contestations', icon: AlertCircle },
      ]
    case 'EMPLOYE':
    default:
      return [
        { type: 'link', name: 'Tableau de bord', href: '/dashboard/employe', icon: LayoutDashboard },
        { type: 'group', label: 'Mes KPI' },
        { type: 'link', name: 'Mes KPI', href: '/employe/mes-kpi', icon: Target },
        { type: 'link', name: 'Saisir mes réalisations', href: '/saisie', icon: ClipboardList },
        { type: 'link', name: 'Mon historique', href: '/employe/historique', icon: History },
      ]
  }
}

interface SidebarProps {
  onClose?: () => void
  /** When true, sidebar is visible on mobile (e.g. hamburger opened) */
  open?: boolean
}

export function Sidebar({ onClose, open = false }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { nom: nomEtablissement } = useEtablissement()
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'EMPLOYE'
  const navItems = getNavForRole(role)
  const navLinks = navItems.filter((item): item is NavLink => item.type === 'link')
  const activeHref = getActiveHref(pathname, navLinks)
  const afficheCompteurValidation = ['DG', 'DIRECTEUR', 'MANAGER', 'CHEF_SERVICE'].includes(role)
  const [saisiesAValider, setSaisiesAValider] = useState(0)

  useEffect(() => {
    if (!afficheCompteurValidation) {
      setSaisiesAValider(0)
      return
    }
    let cancelled = false
    fetch('/api/manager/sidebar-compteurs')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data != null) {
          setSaisiesAValider(typeof data.saisiesAValider === 'number' ? data.saisiesAValider : 0)
        }
      })
      .catch(() => {
        if (!cancelled) setSaisiesAValider(0)
      })
    return () => {
      cancelled = true
    }
  }, [afficheCompteurValidation, pathname])
  const displayName = session?.user
    ? `${(session.user as { prenom?: string }).prenom ?? ''} ${(session.user as { nom?: string }).nom ?? ''}`.trim() || (session.user as { email?: string }).email
    : 'Utilisateur'

  return (
    <>
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-gradient-to-b from-[#003369] to-[#22688e] border-r border-white/10 shadow-lg transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain scroll-smooth">
            <div className="flex h-20 shrink-0 items-center justify-center border-b border-white/20 px-6 py-4 relative">
              <div className="w-[100px]">
                <Image
                  src="/images/bgfi-bank-logo.png"
                  alt={nomEtablissement}
                  width={100}
                  height={42}
                  className="w-full h-auto"
                  priority
                />
              </div>
              {open && onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-white hover:bg-white/20 absolute right-4"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>

            <nav className="px-3 py-4 pb-6 space-y-0.5">
              {navItems.map((item, index) => {
                if (item.type === 'group') {
                  return (
                    <div
                      key={`group-${item.label}`}
                      className={cn(
                        'pb-1 px-3 text-[11px] font-semibold text-white/55 uppercase tracking-wider',
                        index > 0 ? 'pt-5 mt-1 border-t border-white/10' : 'pt-1'
                      )}
                    >
                      {item.label}
                    </div>
                  )
                }
                const isActive = activeHref === item.href
                const badgeCount =
                  item.countKey === 'saisiesAValider' && saisiesAValider > 0 ? saisiesAValider : 0
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive ? 'bg-white/20 text-white shadow-sm' : 'text-white/80 hover:bg-white/10 hover:text-white'
                    )}
                    onClick={() => onClose?.()}
                  >
                    <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'stroke-[2.5]' : 'stroke-[2]')} />
                    <span className="flex-1 min-w-0 truncate">{item.name}</span>
                    {badgeCount > 0 && (
                      <span
                        className="ml-auto flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-bold leading-none text-[#003369]"
                        aria-label={`${badgeCount} saisie${badgeCount > 1 ? 's' : ''} en attente`}
                      >
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="shrink-0 p-4 border-t border-white/20 bg-[#22688e]/95">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border-2 border-white/20">
                <AvatarFallback className="bg-white/20 text-white text-sm">
                  {displayName?.charAt(0).toUpperCase() || (session?.user as { email?: string })?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{displayName || 'Utilisateur'}</p>
                <p className="text-xs text-white/70 truncate">{ROLE_LABELS[role] ?? role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
