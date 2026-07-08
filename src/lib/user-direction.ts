import { prisma } from '@/lib/prisma'
import type { Assignateur } from '@/lib/assignation-rules'

export type UserDirectionSource = {
  directionId?: number | null
  service?: { directionId?: number | null } | null
}

/** Direction effective : directe sur l'utilisateur ou via son service. */
export function resolveUserDirectionId(user: UserDirectionSource): number | null {
  return user.directionId ?? user.service?.directionId ?? null
}

export async function getUserDirectionId(userId: number): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      directionId: true,
      service: { select: { directionId: true } },
    },
  })
  if (!user) return null
  return resolveUserDirectionId(user)
}

export async function canAccessDirectionCatalogue(
  assignateur: Assignateur,
  directionId: number
): Promise<boolean> {
  if (assignateur.role === 'DG') return true
  if (assignateur.role === 'DIRECTEUR' && assignateur.directionId === directionId) {
    return true
  }
  if (assignateur.role === 'CHEF_SERVICE' && assignateur.serviceId != null) {
    const service = await prisma.service.findUnique({
      where: { id: assignateur.serviceId },
      select: { directionId: true },
    })
    return service?.directionId === directionId
  }
  if (assignateur.role === 'MANAGER') {
    const count = await prisma.user.count({
      where: {
        actif: true,
        managerId: assignateur.id,
        OR: [
          { directionId, serviceId: null },
          { service: { directionId } },
        ],
      },
    })
    return count > 0
  }
  return false
}

export async function isCatalogueKpiAllowedForDirection(
  directionId: number,
  catalogueKpiId: number
): Promise<boolean> {
  const row = await prisma.directionCatalogueKpi.findUnique({
    where: {
      directionId_catalogueKpiId: { directionId, catalogueKpiId },
    },
    select: { id: true },
  })
  return row != null
}
