import { prisma } from '@/lib/prisma'

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
  service: { id: number; nom: string; code: string } | null
  direction: { id: number; nom: string; code: string } | null
  manager: { id: number; nom: string; prenom: string } | null
}

/**
 * Retourne tous les utilisateurs à qui l'assignateur peut assigner des KPI
 * (périmètre organisationnel).
 */
export async function getCollaborateursAssignables(
  assignateur: Assignateur
): Promise<CollaborateurAssignable[]> {
  const select = {
    id: true,
    nom: true,
    prenom: true,
    email: true,
    role: true,
    serviceId: true,
    directionId: true,
    managerId: true,
    service: { select: { id: true, nom: true, code: true } },
    direction: { select: { id: true, nom: true, code: true } },
    manager: { select: { id: true, nom: true, prenom: true } },
  } as const

  switch (assignateur.role) {
    case 'DG': {
      const list = await prisma.user.findMany({
        where: {
          actif: true,
          id: { not: assignateur.id },
        },
        select,
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      })
      return list as CollaborateurAssignable[]
    }

    case 'DIRECTEUR': {
      if (assignateur.directionId == null) return []
      const list = await prisma.user.findMany({
        where: {
          actif: true,
          id: { not: assignateur.id },
          OR: [
            { service: { directionId: assignateur.directionId } },
            { directionId: assignateur.directionId, serviceId: null },
          ],
        },
        select,
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      })
      return list as CollaborateurAssignable[]
    }

    case 'CHEF_SERVICE': {
      if (assignateur.serviceId == null) return []
      const list = await prisma.user.findMany({
        where: {
          actif: true,
          id: { not: assignateur.id },
          serviceId: assignateur.serviceId,
        },
        select,
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      })
      return list as CollaborateurAssignable[]
    }

    case 'MANAGER': {
      const list = await prisma.user.findMany({
        where: {
          actif: true,
          managerId: assignateur.id,
        },
        select,
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      })
      return list as CollaborateurAssignable[]
    }

    default:
      return []
  }
}

/**
 * Vérifie si l'assignateur peut assigner des KPI au destinataire.
 */
export async function peutAssignerA(
  assignateur: Assignateur,
  destinataireId: number
): Promise<boolean> {
  const collaborateurs = await getCollaborateursAssignables(assignateur)
  return collaborateurs.some((c) => c.id === destinataireId)
}
