'use client'

import Link from 'next/link'
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

const ROLE_LABEL: Record<string, string> = {
  DG: 'DG',
  DIRECTEUR: 'Directeur',
  CHEF_SERVICE: 'Chef de service',
  MANAGER: 'Manager',
  EMPLOYE: 'Employé',
}

type NavLink = { type: 'link'; name: string; href: string; icon: React.ComponentType<{ className?: string }> }
type NavGroup = { type: 'group'; label: string }
type NavEntry = NavLink | NavGroup

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
        { type: 'link', name: 'Toutes les directions', href: '/directeur/kpi-direction', icon: Building2 },
        { type: 'link', name: 'Assignations', href: '/manager/assignation', icon: Send },
        { type: 'link', name: "Périodes d'évaluation", href: '/admin/periodes', icon: Calendar },
        { type: 'link', name: 'Configuration de base', href: '/dashboard/admin', icon: Settings },
      ]
    case 'DIRECTEUR':
      return [
        { type: 'group', label: 'Mon évaluation personnelle' },
        { type: 'link', name: 'Mes KPI personnels', href: '/employe/mes-kpi', icon: Target },
        { type: 'link', name: 'Ma saisie mensuelle', href: '/saisie', icon: ClipboardList },
        { type: 'link', name: 'Mon historique', href: '/employe/historique', icon: History },
        { type: 'group', label: 'Gestion de mon équipe' },
        { type: 'link', name: 'Tableau de bord', href: dashboardHref, icon: LayoutDashboard },
        { type: 'link', name: 'Mes KPI direction', href: '/directeur/kpi-direction', icon: Target },
        { type: 'link', name: 'Services', href: '/directeur/services', icon: Building2 },
        { type: 'link', name: 'Rapports', href: '/directeur/rapports', icon: BarChart3 },
      ]
    case 'CHEF_SERVICE':
      return [
        { type: 'link', name: 'Tableau de bord', href: dashboardHref, icon: LayoutDashboard },
        { type: 'link', name: 'Mes KPI service', href: '/chef-service/kpi-service', icon: Target },
        { type: 'link', name: 'Mon équipe', href: '/chef-service/mon-equipe', icon: UserCheck },
      ]
    case 'MANAGER':
      return [
        { type: 'group', label: 'Mon évaluation personnelle' },
        { type: 'link', name: 'Mes KPI personnels', href: '/employe/mes-kpi', icon: Target },
        { type: 'link', name: 'Ma saisie mensuelle', href: '/saisie', icon: ClipboardList },
        { type: 'link', name: 'Mon historique', href: '/employe/historique', icon: History },
        { type: 'group', label: 'Gestion de mon équipe' },
        { type: 'link', name: 'Tableau de bord', href: dashboardHref, icon: LayoutDashboard },
        { type: 'link', name: 'Assigner KPI', href: '/manager/assignation', icon: Send },
        { type: 'link', name: 'Contestations', href: '/manager/assignation/contestations', icon: AlertCircle },
        { type: 'link', name: 'Valider saisies', href: '/manager/validation', icon: CheckCircle2 },
        { type: 'link', name: 'Mon équipe', href: '/manager/equipe', icon: UserCheck },
      ]
    case 'EMPLOYE':
    default:
      return [
        { type: 'link', name: 'Tableau de bord', href: '/dashboard/employe', icon: LayoutDashboard },
        { type: 'link', name: 'Mes KPI', href: '/employe/mes-kpi', icon: Target },
        { type: 'link', name: 'Saisir mes réalisations', href: '/saisie', icon: ClipboardList },
        { type: 'link', name: 'Historique', href: '/employe/historique', icon: History },
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
        <div className="flex flex-col h-full">
          <div className="h-20 flex items-center justify-center px-6 py-4 border-b border-white/20 relative">
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

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              if (item.type === 'group') {
                return (
                  <div
                    key={`group-${item.label}`}
                    className="pt-3 pb-1 px-3 text-xs font-semibold text-white/60 uppercase tracking-wider first:pt-0"
                  >
                    {item.label}
                  </div>
                )
              }
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive ? 'bg-white/20 text-white shadow-sm' : 'text-white/80 hover:bg-white/10 hover:text-white'
                  )}
                  onClick={() => onClose?.()}
                >
                  <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'stroke-[2.5]' : 'stroke-[2]')} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-white/20">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border-2 border-white/20">
                <AvatarFallback className="bg-white/20 text-white text-sm">
                  {displayName?.charAt(0).toUpperCase() || (session?.user as { email?: string })?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{displayName || 'Utilisateur'}</p>
                <p className="text-xs text-white/70 truncate">{ROLE_LABEL[role] ?? role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
