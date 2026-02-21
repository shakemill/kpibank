'use client'

import { ReactNode, useState } from 'react'
import { useEtablissement } from '@/contexts/etablissement-context'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut, Menu } from 'lucide-react'

const ROLE_LABEL: Record<string, string> = {
  DG: 'DG',
  DIRECTEUR: 'Directeur',
  CHEF_SERVICE: 'Chef de service',
  MANAGER: 'Manager',
  EMPLOYE: 'Employé',
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { nom: nomEtablissement } = useEtablissement()
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user as { prenom?: string; nom?: string; email?: string; role?: string } | undefined
  const displayName = user
    ? `${user.prenom ?? ''} ${user.nom ?? ''}`.trim() || user.email
    : 'Utilisateur'
  const role = user?.role ?? 'EMPLOYE'

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
            <h2 className="text-lg font-semibold text-foreground">Système KPI — {nomEtablissement}</h2>
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
                    <Avatar className="h-8 w-8 border-2 border-border">
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{displayName}</span>
                      <span className="text-xs font-normal text-muted-foreground">{ROLE_LABEL[role] ?? role}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onSelect={() => router.push('/profil')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Déconnexion</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </ClientOnly>
        </header>

        <main className="p-4 lg:p-6 min-h-[calc(100vh-4rem)] bg-muted/30">{children}</main>
      </div>
    </div>
  )
}
