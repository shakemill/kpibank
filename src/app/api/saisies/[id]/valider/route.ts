import { NextRequest } from 'next/server'
import { getSessionAndRequireManager } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { canAccessEmployeData } from '@/lib/access-control'
import { apiSuccess, apiError } from '@/lib/api-response'
import { notifierSaisieValidee } from '@/lib/notifications'
import { consolidateEmploye } from '@/lib/consolidation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionAndRequireManager()
  if (result.error) return apiError(result.error, result.status)
  const sessionUser = result.session!.user as { id?: string; role?: string; serviceId?: number; directionId?: number; managerId?: number }
  const currentId = parseInt(sessionUser.id ?? '', 10)
  if (Number.isNaN(currentId)) return apiError('Session invalide', 401)

  const { id: idParam } = await params
  const id = parseInt(idParam, 10)
  if (Number.isNaN(id)) return apiError('id invalide', 400)

  const saisie = await prisma.saisieMensuelle.findUnique({
    where: { id },
    include: { employe: { select: { managerId: true } } },
  })
  if (!saisie) return apiError('Saisie introuvable', 404)
  const allowed = await canAccessEmployeData(
    { id: sessionUser.id!, role: sessionUser.role, serviceId: sessionUser.serviceId, directionId: sessionUser.directionId, managerId: sessionUser.managerId },
    saisie.employeId
  )
  if (!allowed) return apiError('Ce collaborateur n\'est pas dans votre périmètre', 403)
  if (saisie.statut !== 'SOUMISE') {
    return apiError('Seules les saisies soumises peuvent être validées', 400)
  }

  try {
    const updated = await prisma.saisieMensuelle.update({
      where: { id },
      data: {
        statut: 'VALIDEE',
        valideParId: currentId,
        valide_le: new Date(),
      },
      include: {
        kpiEmploye: {
          select: {
            id: true,
            cible: true,
            catalogueKpi: { select: { id: true, nom: true, type: true, unite: true } },
          },
        },
        employe: { select: { id: true, nom: true, prenom: true } },
      },
    })

    let score = 0
    try {
      const periodes = await prisma.periode.findMany({
        where: {
          actif: true,
          mois_debut: { lte: saisie.mois },
          mois_fin: { gte: saisie.mois },
          annee: saisie.annee,
        },
        select: { id: true },
        take: 1,
      })
      if (periodes[0]) {
        const res = await consolidateEmploye(saisie.employeId, periodes[0].id)
        score = res.scoreGlobal
      }
    } catch {
      // Garder score à 0
    }
    await notifierSaisieValidee(saisie.employeId, saisie.mois, saisie.annee, score)

    return apiSuccess(updated)
  } catch (e) {
    return apiError('Erreur lors de la validation', 500, e instanceof Error ? e.message : e)
  }
}
