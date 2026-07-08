import { prisma } from '@/lib/prisma'

export type ChefServiceInfo = {
  id: number
  nom: string
  prenom: string
  email: string
  posteOccupe: string | null
}

export type ValiderChefServiceInput = {
  userId?: number
  role: string
  serviceId: number | null | undefined
}

export async function validerChefService(
  input: ValiderChefServiceInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, role, serviceId } = input

  if (role !== 'CHEF_SERVICE') return { ok: true }
  if (serviceId == null) {
    return { ok: false, error: 'Un département / agence est requis pour un chef.' }
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, responsableId: true },
  })
  if (!service) {
    return { ok: false, error: 'Département / agence introuvable.' }
  }

  const autresChefs = await prisma.user.findMany({
    where: {
      role: 'CHEF_SERVICE',
      serviceId,
      actif: true,
      ...(userId != null ? { id: { not: userId } } : {}),
    },
    select: { id: true },
  })

  if (autresChefs.length > 0) {
    return { ok: false, error: 'Ce département / agence a déjà un chef.' }
  }

  if (userId != null) {
    // Mise à jour : responsableId synchronisé après enregistrement
    return { ok: true }
  }

  if (service.responsableId != null) {
    const responsable = await prisma.user.findUnique({
      where: { id: service.responsableId },
      select: { id: true, role: true, actif: true },
    })
    if (responsable?.actif && responsable.role === 'CHEF_SERVICE') {
      return { ok: false, error: 'Ce département / agence a déjà un chef.' }
    }
    return {
      ok: false,
      error: 'Ce département / agence a déjà un responsable officiel.',
    }
  }

  return { ok: true }
}

/** Chef actif d'un département / agence (role CHEF_SERVICE). */
export async function trouverChefService(serviceId: number): Promise<ChefServiceInfo | null> {
  return prisma.user.findFirst({
    where: {
      serviceId,
      role: 'CHEF_SERVICE',
      actif: true,
    },
    select: { id: true, nom: true, prenom: true, email: true, posteOccupe: true },
  })
}

export async function synchroniserResponsableServiceChef(
  userId: number,
  serviceId: number,
): Promise<void> {
  await prisma.service.update({
    where: { id: serviceId },
    data: { responsableId: userId },
  })
}

/** Met à jour responsableId du service après création ou modification d'un chef. */
export async function synchroniserResponsableApresUtilisateurService(input: {
  userId: number
  role: string
  serviceId: number | null
  previousServiceId?: number | null
}): Promise<void> {
  const { userId, role, serviceId, previousServiceId } = input
  const serviceIdsToClear = new Set<number>()

  if (previousServiceId != null && previousServiceId !== serviceId) {
    serviceIdsToClear.add(previousServiceId)
  }

  const estChef = role === 'CHEF_SERVICE' && serviceId != null

  if (!estChef && serviceId != null) {
    serviceIdsToClear.add(serviceId)
  }

  for (const srvId of serviceIdsToClear) {
    const service = await prisma.service.findUnique({
      where: { id: srvId },
      select: { responsableId: true },
    })
    if (service?.responsableId === userId) {
      await prisma.service.update({
        where: { id: srvId },
        data: { responsableId: null },
      })
    }
  }

  if (estChef && serviceId != null) {
    await synchroniserResponsableServiceChef(userId, serviceId)
  }
}
