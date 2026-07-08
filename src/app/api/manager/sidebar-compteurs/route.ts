import { getSessionAndRequireManager } from '@/lib/api-auth'
import { getCollaborateursAssignables } from '@/lib/assignation-rules'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/api-response'

export async function GET() {
  const result = await getSessionAndRequireManager()
  if (result.error) return apiError(result.error, result.status)

  const user = result.session!.user as {
    id?: string
    role?: string
    serviceId?: number | null
    directionId?: number | null
  }
  const assignateurId = parseInt(user.id ?? '', 10)
  if (Number.isNaN(assignateurId)) return apiError('Session invalide', 401)

  const now = new Date()
  const mois = now.getMonth() + 1
  const annee = now.getFullYear()

  const collaborateurs = await getCollaborateursAssignables({
    id: assignateurId,
    role: user.role ?? '',
    serviceId: user.serviceId ?? null,
    directionId: user.directionId ?? null,
  })
  const employeIds = collaborateurs.map((c) => c.id)

  if (employeIds.length === 0) {
    return apiSuccess({ saisiesAValider: 0, mois, annee })
  }

  const saisiesAValider = await prisma.saisieMensuelle.count({
    where: {
      employeId: { in: employeIds },
      mois,
      annee,
      statut: 'SOUMISE',
    },
  })

  return apiSuccess({ saisiesAValider, mois, annee })
}
