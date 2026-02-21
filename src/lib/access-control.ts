import { prisma } from '@/lib/prisma'

export type SessionUser = {
  id: string
  role?: string
  serviceId?: number | null
  directionId?: number | null
  managerId?: number | null
}

/**
 * Vérifie que l'utilisateur connecté peut accéder aux données d'un employé :
 * lui-même, son manager direct, le chef de son service, le directeur de sa direction, ou le DG.
 */
export async function canAccessEmployeData(
  sessionUser: SessionUser,
  employeId: number
): Promise<boolean> {
  const currentId = parseInt(sessionUser.id, 10)
  if (Number.isNaN(currentId)) return false
  if (currentId === employeId) return true
  const role = sessionUser.role ?? ''
  if (role === 'DG') return true

  const employe = await prisma.user.findUnique({
    where: { id: employeId },
    select: { managerId: true, serviceId: true, directionId: true },
  })
  if (!employe) return false
  if (employe.managerId === currentId) return true
  if (sessionUser.role === 'DIRECTEUR' && employe.directionId === sessionUser.directionId) return true
  if (sessionUser.role === 'CHEF_SERVICE' && employe.serviceId === sessionUser.serviceId) return true
  if (['MANAGER', 'DIRECTEUR', 'CHEF_SERVICE'].includes(role)) {
    const managed = await prisma.user.findFirst({
      where: { id: employeId, managerId: currentId },
      select: { id: true },
    })
    if (managed) return true
    const serviceResp = await prisma.service.findFirst({
      where: { id: employe.serviceId ?? 0, responsableId: currentId },
      select: { id: true },
    })
    if (serviceResp) return true
    const dirResp = await prisma.direction.findFirst({
      where: { id: employe.directionId ?? 0, responsableId: currentId },
      select: { id: true },
    })
    if (dirResp) return true
  }
  return false
}
