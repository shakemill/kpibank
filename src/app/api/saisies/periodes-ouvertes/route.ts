import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-response'

/**
 * GET /api/saisies/periodes-ouvertes
 * Liste des (mois, annee) pour lesquels la saisie a été rouverte par le N+1 pour l'utilisateur connecté.
 */
export async function GET(_request: NextRequest) {
  const session = await auth()
  if (!session?.user) return apiError('Non authentifié', 401)
  const employeId = parseInt((session.user as { id?: string }).id ?? '', 10)
  if (Number.isNaN(employeId)) return apiError('Session invalide', 401)

  const list = await prisma.saisiePeriodeOuverte.findMany({
    where: { employeId },
    select: { mois: true, annee: true },
    orderBy: [{ annee: 'desc' }, { mois: 'desc' }],
  })
  return apiSuccess({ periodes: list.map((p) => ({ mois: p.mois, annee: p.annee })) })
}
