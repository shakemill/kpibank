import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getSessionAndRequireDG } from '@/lib/api-auth'

/** POST : passer la période en EN_COURS. Une seule période par type peut être EN_COURS. */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const result = await getSessionAndRequireDG()
  if (result.error) return apiError(result.error, result.status)
  const { id } = await context.params
  const idNum = parseInt(id, 10)
  if (Number.isNaN(idNum)) return apiError('ID invalide', 400)
  const periode = await prisma.periode.findUnique({ where: { id: idNum } })
  if (!periode) return apiError('Période introuvable', 404)
  if (periode.statut === 'CLOTUREE') return apiError('Impossible d\'activer une période clôturée', 400)
  try {
    await prisma.$transaction([
      prisma.periode.updateMany({
        where: { type: periode.type, statut: 'EN_COURS' },
        data: { statut: 'A_VENIR' },
      }),
      prisma.periode.update({
        where: { id: idNum },
        data: { statut: 'EN_COURS' },
      }),
    ])
    const updated = await prisma.periode.findUnique({ where: { id: idNum } })
    return apiSuccess(updated)
  } catch (e) {
    return apiError('Erreur activation', 500, e instanceof Error ? e.message : e)
  }
}
