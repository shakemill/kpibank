import { NextRequest } from 'next/server'
import { getSessionAndRequireManager } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { saisieRejeterSchema } from '@/lib/validations/saisie'
import { canAccessEmployeData } from '@/lib/access-control'
import { apiSuccess, apiError } from '@/lib/api-response'
import { sanitizeOptionalText } from '@/lib/sanitize'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionAndRequireManager()
  if (result.error) return apiError(result.error, result.status)
  const sessionUser = result.session!.user as { id?: string; role?: string; serviceId?: number; directionId?: number; managerId?: number }

  const { id: idParam } = await params
  const id = parseInt(idParam, 10)
  if (Number.isNaN(id)) return apiError('id invalide', 400)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Body JSON invalide', 400)
  }
  const parsed = saisieRejeterSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('Motif obligatoire', 400, parsed.error.flatten())
  }

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
    return apiError('Seules les saisies soumises peuvent être rejetées', 400)
  }

  const motif = sanitizeOptionalText(parsed.data.motif)

  try {
    const updated = await prisma.saisieMensuelle.update({
      where: { id },
      data: {
        statut: 'REJETEE',
        commentaire: motif,
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

    await prisma.notification.create({
      data: {
        destinataireId: saisie.employeId,
        type: 'VALIDATION_REQUISE',
        titre: 'Saisie rejetée',
        message: `Votre saisie pour ${saisie.mois}/${saisie.annee} a été rejetée. Motif : ${motif ?? ''}`,
        lien: '/saisie',
      },
    })

    return apiSuccess(updated)
  } catch (e) {
    return apiError('Erreur lors du rejet', 500, e instanceof Error ? e.message : e)
  }
}
