import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { AuditAction, createAuditLog } from '@/lib/audit-log'

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
  '/employe': ['DG', 'DIRECTEUR', 'CHEF_SERVICE', 'MANAGER', 'EMPLOYE'],
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = String(credentials.email).trim().toLowerCase()
        const password = String(credentials.password)

        const { allowed } = checkRateLimit(`auth:${email}`)
        if (!allowed) {
          await createAuditLog({
            action: AuditAction.AUTH_LOGIN_FAIL,
            details: `rate_limit · ${email}`,
          })
          throw new Error('Trop de tentatives. Réessayez dans 1 minute.')
        }

        const { prisma } = await import('@/lib/prisma')
        const user = await prisma.user.findUnique({
          where: { email },
        })
        if (!user) {
          await createAuditLog({
            action: AuditAction.AUTH_LOGIN_FAIL,
            details: `inconnu · ${email}`,
          })
          return null
        }
        if (!user.actif) {
          await createAuditLog({
            userId: user.id,
            action: AuditAction.AUTH_LOGIN_FAIL,
            entityType: 'User',
            entityId: user.id,
            details: `désactivé · ${email}`,
          })
          throw new Error('Compte désactivé')
        }
        const valid = await bcrypt.compare(password, user.password)
        if (!valid) {
          await createAuditLog({
            userId: user.id,
            action: AuditAction.AUTH_LOGIN_FAIL,
            entityType: 'User',
            entityId: user.id,
            details: `mdp · ${email}`,
          })
          return null
        }

        await createAuditLog({
          userId: user.id,
          action: AuditAction.AUTH_LOGIN_SUCCESS,
          entityType: 'User',
          entityId: user.id,
          details: email,
        })

        const forcePasswordChange = (user as { force_password_change?: boolean }).force_password_change ?? false
        return {
          id: String(user.id),
          email: user.email,
          nom: user.nom,
          prenom: user.prenom,
          role: user.role,
          serviceId: user.serviceId,
          directionId: user.directionId,
          managerId: user.managerId,
          force_password_change: forcePasswordChange,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth: session, request }) {
      const path = request.nextUrl.pathname
      const isLogin = path === '/login'
      const isAuthApi = path.startsWith('/api/auth')
      const isCronApi = path.startsWith('/api/cron')
      const isProfil = path === '/profil'
      if (isLogin || isAuthApi || isCronApi) return true
      if (!session?.user) return NextResponse.redirect(new URL('/login', request.url))
      const forcePasswordChange = (session.user as { force_password_change?: boolean }).force_password_change
      if (forcePasswordChange && !isProfil) {
        return NextResponse.redirect(new URL('/profil', request.url))
      }
      const role = (session.user as { role?: string }).role ?? ''
      const dashboard = ROLE_DASHBOARD[role] ?? '/dashboard/employe'
      if (path === '/' || path === '/dashboard' || path === '/dashboard/') {
        return NextResponse.redirect(new URL(dashboard, request.url))
      }
      for (const [prefix, allowedRoles] of Object.entries(PREFIX_ROLES)) {
        if (path.startsWith(prefix) && !allowedRoles.includes(role)) {
          return NextResponse.redirect(new URL(dashboard, request.url))
        }
      }
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email ?? ''
        token.nom = (user as { nom?: string }).nom ?? ''
        token.prenom = (user as { prenom?: string }).prenom ?? ''
        token.role = (user as { role?: string }).role ?? ''
        token.serviceId = (user as { serviceId?: number | null }).serviceId ?? null
        token.directionId = (user as { directionId?: number | null }).directionId ?? null
        token.managerId = (user as { managerId?: number | null }).managerId ?? null
        token.force_password_change = (user as { force_password_change?: boolean }).force_password_change ?? false
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.email = token.email
        session.user.nom = token.nom
        session.user.prenom = token.prenom
        session.user.role = token.role
        session.user.serviceId = token.serviceId
        session.user.directionId = token.directionId
        session.user.managerId = token.managerId
        const userId = typeof token.id === 'number' ? token.id : parseInt(String(token.id), 10)
        if (!Number.isNaN(userId)) {
          const u = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              force_password_change: true,
              direction: { select: { nom: true } },
              service: { select: { nom: true } },
            },
          })
          session.user.force_password_change = u?.force_password_change ?? false
          session.user.perimetreLabel = u?.service?.nom ?? u?.direction?.nom ?? null
        } else {
          session.user.force_password_change = (token as { force_password_change?: boolean }).force_password_change ?? false
          session.user.perimetreLabel = null
        }
      }
      return session
    },
  },
})
