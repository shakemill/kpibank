import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessEmployeData } from '@/lib/access-control'
import { apiSuccess, apiError } from '@/lib/api-response'

const MANAGER_ROLES = ['MANAGER', 'DG', 'DIRECTEUR', 'CHEF_SERVICE']

/**
 * POST /api/saisies/ouvrir-periode
 * Le N+1 ouvre une période de saisie dépassée pour un collaborateur.
 * Body: { employeId: number, mois: number, annee: number }
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return apiError('Non authentifié', 401)
  const role = (session.user as { role?: string }).role ?? ''
  if (!MANAGER_ROLES.includes(role)) {
    return apiError('Accès réservé au manager', 403)
  }
  const currentId = parseInt((session.user as { id?: string }).id ?? '', 10)
  if (Number.isNaN(currentId)) return apiError('Session invalide', 401)

  let body: { employeId?: number; mois?: number; annee?: number }
  try {
    body = await request.json()
  } catch {
    return apiError('Body JSON invalide', 400)
  }
  const employeId = typeof body.employeId === 'number' ? body.employeId : parseInt(String(body.employeId ?? ''), 10)
  const mois = typeof body.mois === 'number' ? body.mois : parseInt(String(body.mois ?? ''), 10)
  const annee = typeof body.annee === 'number' ? body.annee : parseInt(String(body.annee ?? ''), 10)
  if (Number.isNaN(employeId) || Number.isNaN(mois) || mois < 1 || mois > 12 || Number.isNaN(annee)) {
    return apiError('employeId, mois (1-12) et annee requis', 400)
  }

  const allowed = await canAccessEmployeData(
    {
      id: String(currentId),
      role,
      serviceId: (session.user as { serviceId?: number }).serviceId,
      directionId: (session.user as { directionId?: number }).directionId,
      managerId: (session.user as { managerId?: number }).managerId,
    },
    employeId
  )
  if (!allowed) return apiError('Ce collaborateur n\'est pas dans votre périmètre', 403)

  try {
    await prisma.saisiePeriodeOuverte.upsert({
      where: {
        employeId_mois_annee: { employeId, mois, annee },
      },
      create: { employeId, mois, annee, ouvertParId: currentId },
      update: { ouvertParId: currentId },
    })
    return apiSuccess({ employeId, mois, annee })
  } catch (e) {
    return apiError('Erreur lors de l\'ouverture de la période', 500, e instanceof Error ? e.message : undefined)
  }
}
