import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getSessionAndRequireDG } from '@/lib/api-auth'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const idNum = parseInt(id, 10)
  if (Number.isNaN(idNum)) return apiError('ID invalide', 400)
  const periode = await prisma.periode.findUnique({
    where: { id: idNum },
    include: {
      _count: {
        select: { kpiDirections: true, kpiServices: true, kpiEmployes: true },
      },
    },
  })
  if (!periode) return apiError('Période introuvable', 404)
  return apiSuccess(periode)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const result = await getSessionAndRequireDG()
  if (result.error) return apiError(result.error, result.status)
  const { id } = await context.params
  const idNum = parseInt(id, 10)
  if (Number.isNaN(idNum)) return apiError('ID invalide', 400)
  const periode = await prisma.periode.findUnique({ where: { id: idNum } })
  if (!periode) return apiError('Période introuvable', 404)
  if (periode.statut === 'CLOTUREE') return apiError('Une période clôturée ne peut pas être modifiée', 400)
  try {
    const body = await request.json()
    const data: { date_limite_saisie?: Date; statut?: string } = {}
    if (body.date_limite_saisie) {
      data.date_limite_saisie = new Date(body.date_limite_saisie)
    }
    if (body.statut && ['A_VENIR', 'EN_COURS', 'CLOTUREE'].includes(body.statut)) {
      data.statut = body.statut
    }
    const updated = await prisma.periode.update({
      where: { id: idNum },
      data,
    })
    return apiSuccess(updated)
  } catch (e) {
    return apiError('Erreur mise à jour', 500, e instanceof Error ? e.message : e)
  }
}
