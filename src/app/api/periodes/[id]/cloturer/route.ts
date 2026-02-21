import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getSessionAndRequireDG } from '@/lib/api-auth'

/** POST : clôturer la période (irréversible). */
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
  if (periode.statut === 'CLOTUREE') return apiError('Période déjà clôturée', 400)
  try {
    const updated = await prisma.periode.update({
      where: { id: idNum },
      data: { statut: 'CLOTUREE' },
    })
    return apiSuccess(updated)
  } catch (e) {
    return apiError('Erreur clôture', 500, e instanceof Error ? e.message : e)
  }
}
