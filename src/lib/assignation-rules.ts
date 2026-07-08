import { prisma } from '@/lib/prisma'
import { resolveUserDirectionId, type UserDirectionSource } from '@/lib/user-direction'

export type Assignateur = {
  id: number
  role: string
  serviceId: number | null
  directionId: number | null
}

export type CollaborateurAssignable = {
  id: number
  nom: string
  prenom: string
  email: string
  role: string
  serviceId: number | null
  directionId: number | null
  managerId: number | null
  service: {
    id: number
    nom: string
    code: string
    directionId?: number
    direction?: { id: number; nom: string; code: string } | null
  } | null
  direction: { id: number; nom: string; code: string } | null
  manager: { id: number; nom: string; prenom: string } | null
}

const collaborateurSelect = {
  id: true,
  nom: true,
  prenom: true,
  email: true,
  role: true,
  serviceId: true,
  directionId: true,
  managerId: true,
  service: {
    select: {
      id: true,
      nom: true,
      code: true,
      directionId: true,
      direction: { select: { id: true, nom: true, code: true } },
    },
  },
  direction: { select: { id: true, nom: true, code: true } },
  manager: { select: { id: true, nom: true, prenom: true } },
} as const

function mapCollaborateur(
  u: CollaborateurAssignable & UserDirectionSource
): CollaborateurAssignable {
  const effectiveDirectionId = resolveUserDirectionId(u)
  const effectiveDirection =
    u.direction ??
    (u.service && 'direction' in u.service ? u.service.direction : null) ??
    null
  return {
    id: u.id,
    nom: u.nom,
    prenom: u.prenom,
    email: u.email,
    role: u.role,
    serviceId: u.serviceId,
    directionId: effectiveDirectionId,
    managerId: u.managerId,
    service: u.service
      ? { id: u.service.id, nom: u.service.nom, code: u.service.code }
      : null,
    direction: effectiveDirection
      ? { id: effectiveDirection.id, nom: effectiveDirection.nom, code: effectiveDirection.code }
      : null,
    manager: u.manager,
  }
}

/**
 * Retourne tous les utilisateurs à qui l'assignateur peut assigner des KPI
 * (périmètre organisationnel).
 *
 * Délégation : le directeur (et adjoint) peut assigner à tout son staff ;
 * les chefs de service et managers conservent le droit d'assigner dans leur périmètre.
 */
export async function getCollaborateursAssignables(
  assignateur: Assignateur
): Promise<CollaborateurAssignable[]> {
  switch (assignateur.role) {
    case 'DG': {
      const list = await prisma.user.findMany({
        where: {
          actif: true,
          id: { not: assignateur.id },
        },
        select: collaborateurSelect,
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      })
      return list.map((u) => mapCollaborateur(u as CollaborateurAssignable & UserDirectionSource))
    }

    case 'DIRECTEUR': {
      if (assignateur.directionId == null) return []
      const list = await prisma.user.findMany({
        where: {
          actif: true,
          id: { not: assignateur.id },
          role: { not: 'DIRECTEUR' },
          OR: [
            { service: { directionId: assignateur.directionId } },
            { directionId: assignateur.directionId, serviceId: null },
          ],
        },
        select: collaborateurSelect,
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      })
      return list.map((u) => mapCollaborateur(u as CollaborateurAssignable & UserDirectionSource))
    }

    case 'CHEF_SERVICE': {
      if (assignateur.serviceId == null) return []
      const list = await prisma.user.findMany({
        where: {
          actif: true,
          id: { not: assignateur.id },
          serviceId: assignateur.serviceId,
        },
        select: collaborateurSelect,
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      })
      return list.map((u) => mapCollaborateur(u as CollaborateurAssignable & UserDirectionSource))
    }

    case 'MANAGER': {
      const list = await prisma.user.findMany({
        where: {
          actif: true,
          managerId: assignateur.id,
        },
        select: collaborateurSelect,
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      })
      return list.map((u) => mapCollaborateur(u as CollaborateurAssignable & UserDirectionSource))
    }

    default:
      return []
  }
}

/**
 * Vérifie si l'assignateur peut assigner des KPI au destinataire (requête ciblée).
 */
export async function peutAssignerA(
  assignateur: Assignateur,
  destinataireId: number
): Promise<boolean> {
  if (assignateur.id === destinataireId) return false

  const destinataire = await prisma.user.findFirst({
    where: { id: destinataireId, actif: true },
    select: {
      id: true,
      role: true,
      serviceId: true,
      directionId: true,
      managerId: true,
      service: { select: { directionId: true } },
    },
  })
  if (!destinataire) return false

  switch (assignateur.role) {
    case 'DG':
      return true
    case 'DIRECTEUR': {
      if (assignateur.directionId == null || destinataire.role === 'DIRECTEUR') return false
      const destDirectionId = resolveUserDirectionId(destinataire)
      return destDirectionId === assignateur.directionId
    }
    case 'CHEF_SERVICE':
      return (
        assignateur.serviceId != null && destinataire.serviceId === assignateur.serviceId
      )
    case 'MANAGER':
      return destinataire.managerId === assignateur.id
    default:
      return false
  }
}
