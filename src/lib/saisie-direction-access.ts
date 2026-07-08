import { prisma } from '@/lib/prisma'

export async function canAccessKpiDirection(
  kpiDirectionId: number,
  user: { id: string; role?: string; directionId?: number | null }
): Promise<boolean> {
  const role = user.role ?? ''
  if (role === 'DG') return true

  const kpiDir = await prisma.kpiDirection.findUnique({
    where: { id: kpiDirectionId },
    select: { directionId: true },
  })
  if (!kpiDir) return false

  if (role === 'DIRECTEUR') {
    return user.directionId != null && user.directionId === kpiDir.directionId
  }

  return false
}

export async function getDirectionIdForSaisie(user: {
  role?: string
  directionId?: number | null
}): Promise<number | null> {
  if (user.role === 'DG') return null
  if (user.role === 'DIRECTEUR') return user.directionId ?? null
  return null
}
