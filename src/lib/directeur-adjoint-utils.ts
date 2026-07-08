import { prisma } from '@/lib/prisma'

export function estDirecteurAdjoint(posteOccupe: string | null | undefined): boolean {
  return /adjoint/i.test((posteOccupe ?? '').trim())
}

export function estDirecteurTitulaire(
  role: string | null | undefined,
  posteOccupe: string | null | undefined,
): boolean {
  return role === 'DIRECTEUR' && !estDirecteurAdjoint(posteOccupe)
}

export type ValiderDirecteurInput = {
  userId?: number
  role: string
  directionId: number | null | undefined
  posteOccupe: string | null | undefined
}

export async function validerDirecteurDirection(
  input: ValiderDirecteurInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId, role, directionId, posteOccupe } = input

  if (role !== 'DIRECTEUR') return { ok: true }
  if (directionId == null) {
    return { ok: false, error: 'Une direction est requise pour un directeur.' }
  }

  const direction = await prisma.direction.findUnique({
    where: { id: directionId },
    select: { id: true, responsableId: true },
  })
  if (!direction) {
    return { ok: false, error: 'Direction introuvable.' }
  }

  const adjoint = estDirecteurAdjoint(posteOccupe)

  const autresDirecteurs = await prisma.user.findMany({
    where: {
      role: 'DIRECTEUR',
      directionId,
      actif: true,
      ...(userId != null ? { id: { not: userId } } : {}),
    },
    select: { id: true, posteOccupe: true },
  })

  const autresAdjoints = autresDirecteurs.filter((d) => estDirecteurAdjoint(d.posteOccupe))
  const autresTitulaires = autresDirecteurs.filter((d) => !estDirecteurAdjoint(d.posteOccupe))

  if (adjoint) {
    if (autresAdjoints.length > 0) {
      return { ok: false, error: 'Cette direction a déjà un directeur adjoint.' }
    }
    if (userId != null && direction.responsableId === userId) {
      return {
        ok: false,
        error: 'Le directeur adjoint ne peut pas être le responsable officiel de la direction.',
      }
    }
    return { ok: true }
  }

  if (autresTitulaires.length > 0) {
    return { ok: false, error: 'Cette direction a déjà un directeur titulaire.' }
  }

  if (userId != null) {
    // Mise à jour : responsableId synchronisé après enregistrement (synchroniserResponsableApresUtilisateur)
    return { ok: true }
  }

  // Création : le responsable sera défini après création si absent
  if (direction.responsableId != null) {
    const responsable = await prisma.user.findUnique({
      where: { id: direction.responsableId },
      select: { id: true, role: true, posteOccupe: true, actif: true },
    })
    if (
      responsable?.actif &&
      responsable.role === 'DIRECTEUR' &&
      !estDirecteurAdjoint(responsable.posteOccupe)
    ) {
      return { ok: false, error: 'Cette direction a déjà un directeur titulaire.' }
    }
    return {
      ok: false,
      error:
        'Cette direction a déjà un responsable officiel. Retirez-le ou créez un directeur adjoint (fonction contenant « adjoint »).',
    }
  }

  return { ok: true }
}

/** Après création d'un directeur titulaire, l'enregistrer comme responsable de la direction. */
export async function synchroniserResponsableDirectionTitulaire(
  userId: number,
  directionId: number,
  posteOccupe: string | null | undefined,
): Promise<void> {
  if (estDirecteurAdjoint(posteOccupe)) return

  await prisma.direction.update({
    where: { id: directionId },
    data: { responsableId: userId },
  })
}

export type DirecteurTitulaireInfo = {
  id: number
  nom: string
  prenom: string
  email: string
  posteOccupe: string | null
}

/** Directeur titulaire actif d'une direction (role DIRECTEUR, fonction sans « adjoint »). */
export async function trouverDirecteurTitulaire(
  directionId: number,
): Promise<DirecteurTitulaireInfo | null> {
  const directeurs = await prisma.user.findMany({
    where: {
      directionId,
      role: 'DIRECTEUR',
      actif: true,
    },
    select: { id: true, nom: true, prenom: true, email: true, posteOccupe: true },
  })
  const titulaire = directeurs.find((d) => !estDirecteurAdjoint(d.posteOccupe))
  return titulaire ?? null
}

/** Met à jour responsableId après création ou modification d'un utilisateur directeur. */
export async function synchroniserResponsableApresUtilisateur(input: {
  userId: number
  role: string
  directionId: number | null
  posteOccupe: string | null | undefined
  previousDirectionId?: number | null
}): Promise<void> {
  const { userId, role, directionId, posteOccupe, previousDirectionId } = input
  const directionIdsToClear = new Set<number>()

  if (previousDirectionId != null && previousDirectionId !== directionId) {
    directionIdsToClear.add(previousDirectionId)
  }

  const estTitulaire =
    role === 'DIRECTEUR' && directionId != null && !estDirecteurAdjoint(posteOccupe)

  if (!estTitulaire && directionId != null) {
    directionIdsToClear.add(directionId)
  }

  for (const dirId of directionIdsToClear) {
    const dir = await prisma.direction.findUnique({
      where: { id: dirId },
      select: { responsableId: true },
    })
    if (dir?.responsableId === userId) {
      await prisma.direction.update({
        where: { id: dirId },
        data: { responsableId: null },
      })
    }
  }

  if (estTitulaire && directionId != null) {
    await synchroniserResponsableDirectionTitulaire(userId, directionId, posteOccupe)
  }
}
