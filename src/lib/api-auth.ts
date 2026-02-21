import { auth } from '@/lib/auth'
import type { Session } from 'next-auth'

export type RequireDGResult =
  | { session: Session; error?: never }
  | { session?: never; error: string; status: number }

export type RequireDirecteurResult =
  | { session: Session; directionId: number | null; error?: never }
  | { session?: never; directionId?: never; error: string; status: number }

export type RequireChefServiceResult =
  | { session: Session; serviceId: number; error?: never }
  | { session?: never; serviceId?: never; error: string; status: number }

export type RequireManagerResult =
  | { session: Session; error?: never }
  | { session?: never; error: string; status: number }

/**
 * Vérifie l'authentification et que l'utilisateur a le rôle DG.
 * À utiliser dans les routes API du module organisation/paramètres/utilisateurs.
 */
export async function getSessionAndRequireDG(): Promise<RequireDGResult> {
  const session = await auth()
  if (!session?.user) {
    return { error: 'Non authentifié', status: 401 }
  }
  const role = (session.user as { role?: string }).role
  if (role !== 'DG') {
    return { error: 'Accès réservé au DG', status: 403 }
  }
  return { session }
}

/**
 * Vérifie l'authentification et que l'utilisateur a le rôle DIRECTEUR ou DG.
 * Retourne session et directionId : pour DIRECTEUR = directionId de l'utilisateur, pour DG = null (accès toutes directions).
 */
export async function getSessionAndRequireDirecteur(): Promise<RequireDirecteurResult> {
  const session = await auth()
  if (!session?.user) {
    return { error: 'Non authentifié', status: 401 }
  }
  const role = (session.user as { role?: string }).role
  if (role !== 'DIRECTEUR' && role !== 'DG') {
    return { error: 'Accès réservé au Directeur ou DG', status: 403 }
  }
  const directionId =
    role === 'DIRECTEUR'
      ? (session.user as { directionId?: number }).directionId ?? null
      : null
  return { session, directionId }
}

/**
 * Vérifie l'authentification et que l'utilisateur a le rôle CHEF_SERVICE avec un serviceId.
 * Retourne session et serviceId du service géré.
 */
export async function getSessionAndRequireChefService(): Promise<RequireChefServiceResult> {
  const session = await auth()
  if (!session?.user) {
    return { error: 'Non authentifié', status: 401 }
  }
  const role = (session.user as { role?: string }).role
  if (role !== 'CHEF_SERVICE') {
    return { error: 'Accès réservé au Chef de service', status: 403 }
  }
  const serviceId = (session.user as { serviceId?: number }).serviceId
  if (serviceId == null) {
    return { error: 'Aucun service associé', status: 403 }
  }
  return { session, serviceId }
}

/**
 * Vérifie l'authentification et que l'utilisateur a le rôle MANAGER (ou DG/DIRECTEUR/CHEF_SERVICE pour flexibilité).
 * L'équipe est récupérée par managerId = session.user.id côté API.
 */
export async function getSessionAndRequireManager(): Promise<RequireManagerResult> {
  const session = await auth()
  if (!session?.user) {
    return { error: 'Non authentifié', status: 401 }
  }
  const role = (session.user as { role?: string }).role
  const allowed = ['MANAGER', 'DG', 'DIRECTEUR', 'CHEF_SERVICE']
  if (!role || !allowed.includes(role)) {
    return { error: 'Accès réservé au Manager', status: 403 }
  }
  return { session }
}
