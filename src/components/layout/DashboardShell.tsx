'use client'

import { ReactNode, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sidebar } from '@/components/layout/Sidebar'
import { NotificationBell } from '@/components/notification-bell'
import { ClientOnly } from '@/components/client-only'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut, Menu, Building2, Layers } from 'lucide-react'
import { ROLE_LABELS } from '@/lib/role-labels'
import { NotationGrilleProvider } from '@/contexts/notation-grille-context'
import { cn } from '@/lib/utils'

const ROLE_BADGE_CLASS: Record<string, string> = {
  DG: 'bg-red-500/10 text-red-700 dark:text-red-400',
  DIRECTEUR: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  CHEF_SERVICE: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  MANAGER: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  EMPLOYE: 'bg-muted text-muted-foreground',
}

function initialesUtilisateur(prenom?: string, nom?: string, email?: string): string {
  const p = prenom?.trim().charAt(0) ?? ''
  const n = nom?.trim().charAt(0) ?? ''
  if (p && n) return `${p}${n}`.toUpperCase()
  if (p) return p.toUpperCase()
  if (n) return n.toUpperCase()
  return email?.charAt(0).toUpperCase() ?? 'U'
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user as {
    prenom?: string
    nom?: string
    email?: string
    role?: string
    serviceId?: number | null
    directionId?: number | null
    perimetreLabel?: string | null
  } | undefined
  const displayName = user
    ? `${user.prenom ?? ''} ${user.nom ?? ''}`.trim() || user.email
    : 'Utilisateur'
  const role = user?.role ?? 'EMPLOYE'
  const perimetreLabel = user?.perimetreLabel?.trim() || null
  const perimetreType = user?.serviceId ? 'service' : user?.directionId ? 'direction' : null
  const avatarInitials = initialesUtilisateur(user?.prenom, user?.nom, user?.email)

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <Sidebar onClose={() => setSidebarOpen(false)} open={sidebarOpen} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 h-16 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b border-border shadow-sm flex items-center justify-between px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-accent"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1 lg:ml-0 ml-4">
            <h2 className="text-lg font-semibold text-foreground">Système de Gestion des KPI du Capital Humain</h2>
          </div>

          <ClientOnly
            fallback={
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-md bg-muted/50" aria-hidden />
                <div className="size-9 rounded-full bg-muted/50" aria-hidden />
              </div>
            }
          >
            <div className="flex items-center gap-2">
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover:bg-accent rounded-full">
                    <Avatar className="h-8 w-8 border-2 border-primary/15 ring-2 ring-transparent transition-shadow hover:ring-primary/10">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {avatarInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 p-0 overflow-hidden">
                  <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-4 py-3.5 border-b border-border/60">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0 border-2 border-background shadow-sm">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                          {avatarInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm leading-snug text-foreground">{displayName}</p>
                        {user?.email && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user.email}</p>
                        )}
                        <span
                          className={cn(
                            'inline-flex mt-2 text-[11px] px-2 py-0.5 rounded-full font-medium',
                            ROLE_BADGE_CLASS[role] ?? ROLE_BADGE_CLASS.EMPLOYE,
                          )}
                        >
                          {ROLE_LABELS[role] ?? role}
                        </span>
                      </div>
                    </div>
                    {perimetreLabel && perimetreType && (
                      <div className="mt-3 flex items-start gap-2.5 rounded-lg bg-background/80 border border-border/50 px-2.5 py-2">
                        {perimetreType === 'service' ? (
                          <Layers className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        ) : (
                          <Building2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                            {perimetreType === 'service' ? 'Département / Agence' : 'Direction'}
                          </p>
                          <p className="text-xs text-foreground leading-snug mt-0.5">{perimetreLabel}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-1.5">
                    <DropdownMenuItem
                      className="cursor-pointer rounded-md gap-2 py-2"
                      onSelect={() => router.push('/profil')}
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Mon profil</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer rounded-md gap-2 py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Déconnexion</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </ClientOnly>
        </header>

        <main className="p-4 lg:p-6 min-h-[calc(100vh-4rem)] bg-muted/30">
          <NotationGrilleProvider>{children}</NotationGrilleProvider>
        </main>
      </div>
    </div>
  )
}
