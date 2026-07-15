import { NextRequest } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { saisieRejeterSchema } from '@/lib/validations/saisie'
import { apiSuccess, apiError } from '@/lib/api-response'
import { AuditAction, auditFromRequest } from '@/lib/audit-log'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionAndRequireDG()
  if (result.error) return apiError(result.error, result.status)

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
    return apiError('Données invalides', 400, parsed.error.flatten())
  }

  const saisie = await prisma.saisieDirection.findUnique({ where: { id } })
  if (!saisie) return apiError('Saisie introuvable', 404)
  if (saisie.statut !== 'SOUMISE') {
    return apiError('Seules les saisies soumises peuvent être rejetées', 400)
  }

  try {
    const updated = await prisma.saisieDirection.update({
      where: { id },
      data: {
        statut: 'REJETEE',
        commentaire: parsed.data.motif,
      },
      include: {
        kpiDirection: {
          select: {
            id: true,
            cible: true,
            catalogueKpi: { select: { id: true, nom: true, type: true, unite: true } },
          },
        },
        },
      })
    await auditFromRequest(request, {
      userId: (result.session!.user as { id?: string }).id,
      action: AuditAction.SAISIE_DIR_REJECT,
      entityType: 'SaisieDirection',
      entityId: id,
      details: parsed.data.motif ? `motif=${parsed.data.motif.slice(0, 200)}` : undefined,
    })
    return apiSuccess(updated)
  } catch (e) {
    return apiError('Erreur lors du rejet', 500, e instanceof Error ? e.message : e)
  }
}
