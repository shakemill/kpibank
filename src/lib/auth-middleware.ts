/**
 * Config NextAuth utilisée uniquement par le middleware (Edge Runtime).
 * Aucun provider Credentials, pas d'import Prisma/bcrypt — évite "node:buffer" et "node:path" en Edge.
 */
import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'

const ROLE_DASHBOARD: Record<string, string> = {
  DG: '/dashboard/dg',
  DIRECTEUR: '/dashboard/directeur',
  CHEF_SERVICE: '/dashboard/chef-service',
  MANAGER: '/dashboard/manager',
  EMPLOYE: '/dashboard/employe',
}

const PREFIX_ROLES: Record<string, string[]> = {
  '/admin': ['DG'],
  '/directeur': ['DG', 'DIRECTEUR'],
  '/chef-service': ['DG', 'DIRECTEUR', 'CHEF_SERVICE'],
  '/manager': ['DG', 'DIRECTEUR', 'CHEF_SERVICE', 'MANAGER'],
  // Mes KPI personnels, saisie, historique : EMPLOYE, MANAGER, DIRECTEUR (et CHEF_SERVICE, DG)
  '/employe': ['DG', 'DIRECTEUR', 'CHEF_SERVICE', 'MANAGER', 'EMPLOYE'],
}

const nextAuth = NextAuth({
  trustHost: true,
  providers: [],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth: session, request }) {
      const path = request.nextUrl.pathname
      const isLogin = path === '/login'
      const isAuthApi = path.startsWith('/api/auth')
      if (isLogin || isAuthApi) return true
      if (!session?.user) return NextResponse.redirect(new URL('/login', request.url))
      const role = (session.user as { role?: string }).role ?? ''
      const dashboard = ROLE_DASHBOARD[role] ?? '/dashboard/employe'
      if (path === '/' || path === '/dashboard' || path === '/dashboard/') {
        return NextResponse.redirect(new URL(dashboard, request.url))
      }
      if (path.startsWith('/organisation') || path.startsWith('/parametres') || path.startsWith('/catalogue-kpi') || path.startsWith('/etablissement')) {
        if (role !== 'DG') return NextResponse.redirect(new URL(dashboard, request.url))
        return true
      }
      for (const [prefix, allowedRoles] of Object.entries(PREFIX_ROLES)) {
        if (path.startsWith(prefix) && !allowedRoles.includes(role)) {
          return NextResponse.redirect(new URL(dashboard, request.url))
        }
      }
      return true
    },
    jwt({ token }) {
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.nom = token.nom
        session.user.prenom = token.prenom
        session.user.role = token.role
        session.user.serviceId = token.serviceId
        session.user.directionId = token.directionId
        session.user.managerId = token.managerId
      }
      return session
    },
  },
})

export const auth = nextAuth.auth
