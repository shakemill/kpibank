import { NextRequest } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { consolidateDirection } from '@/lib/consolidation'
import { apiSuccess, apiError } from '@/lib/api-response'
import { AuditAction, auditFromRequest } from '@/lib/audit-log'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionAndRequireDG()
  if (result.error) return apiError(result.error, result.status)

  const currentId = parseInt((result.session!.user as { id?: string }).id ?? '', 10)
  if (Number.isNaN(currentId)) return apiError('Session invalide', 401)

  const { id: idParam } = await params
  const id = parseInt(idParam, 10)
  if (Number.isNaN(id)) return apiError('id invalide', 400)

  const saisie = await prisma.saisieDirection.findUnique({
    where: { id },
    include: {
      kpiDirection: {
        select: { directionId: true, periodeId: true },
      },
    },
  })
  if (!saisie) return apiError('Saisie introuvable', 404)
  if (saisie.statut !== 'SOUMISE') {
    return apiError('Seules les saisies soumises peuvent être validées', 400)
  }

  try {
    const updated = await prisma.saisieDirection.update({
      where: { id },
      data: {
        statut: 'VALIDEE',
        valideParId: currentId,
        valide_le: new Date(),
      },
      include: {
        kpiDirection: {
          select: {
            id: true,
            cible: true,
            direction: { select: { id: true, nom: true } },
            catalogueKpi: { select: { id: true, nom: true, type: true, unite: true } },
          },
        },
      },
    })

    try {
      await consolidateDirection(
        saisie.kpiDirection.directionId,
        saisie.kpiDirection.periodeId
      )
    } catch {
      // consolidation optionnelle
    }

    await auditFromRequest(request, {
      userId: (result.session!.user as { id?: string }).id,
      action: AuditAction.SAISIE_DIR_VALIDATE,
      entityType: 'SaisieDirection',
      entityId: id,
      details: `${saisie.mois}/${saisie.annee}`,
    })

    return apiSuccess(updated)
  } catch (e) {
    return apiError('Erreur lors de la validation', 500, e instanceof Error ? e.message : e)
  }
}
