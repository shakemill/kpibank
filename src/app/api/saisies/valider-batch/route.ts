import { NextRequest } from 'next/server'
import { getSessionAndRequireManager } from '@/lib/api-auth'
import { getCollaborateursAssignables } from '@/lib/assignation-rules'
import { canAccessEmployeData } from '@/lib/access-control'
import { prisma } from '@/lib/prisma'
import { validerSaisiesByIds } from '@/lib/saisie-validation'
import { saisieValiderBatchSchema } from '@/lib/validations/saisie'
import { apiError, apiSuccess } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  const result = await getSessionAndRequireManager()
  if (result.error) return apiError(result.error, result.status)

  const sessionUser = result.session!.user as {
    id?: string
    role?: string
    serviceId?: number | null
    directionId?: number | null
    managerId?: number | null
  }
  const valideParId = parseInt(sessionUser.id ?? '', 10)
  if (Number.isNaN(valideParId)) return apiError('Session invalide', 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Body JSON invalide', 400)
  }

  const parsed = saisieValiderBatchSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('Données invalides', 400, parsed.error.flatten())
  }

  let ids: number[] = []

  if ('ids' in parsed.data) {
    ids = parsed.data.ids
  } else {
    const { employeId, mois, annee } = parsed.data
    const allowed = await canAccessEmployeData(
      {
        id: sessionUser.id!,
        role: sessionUser.role,
        serviceId: sessionUser.serviceId ?? undefined,
        directionId: sessionUser.directionId ?? undefined,
        managerId: sessionUser.managerId ?? undefined,
      },
      employeId
    )
    if (!allowed) return apiError("Ce collaborateur n'est pas dans votre périmètre", 403)

    const saisies = await prisma.saisieMensuelle.findMany({
      where: { employeId, mois, annee, statut: 'SOUMISE' },
      select: { id: true },
    })
    ids = saisies.map((s) => s.id)
  }

  if (ids.length === 0) {
    return apiError('Aucune saisie soumise à valider', 400)
  }

  const saisies = await prisma.saisieMensuelle.findMany({
    where: { id: { in: ids }, statut: 'SOUMISE' },
    select: { id: true, employeId: true },
  })
  if (saisies.length === 0) {
    return apiError('Aucune saisie soumise à valider', 400)
  }

  const employeIds = [...new Set(saisies.map((s) => s.employeId))]
  for (const employeId of employeIds) {
    const allowed = await canAccessEmployeData(
      {
        id: sessionUser.id!,
        role: sessionUser.role,
        serviceId: sessionUser.serviceId ?? undefined,
        directionId: sessionUser.directionId ?? undefined,
        managerId: sessionUser.managerId ?? undefined,
      },
      employeId
    )
    if (!allowed) {
      return apiError("Une ou plusieurs saisies ne sont pas dans votre périmètre", 403)
    }
  }

  // Sécurité : ids explicites limités aux collaborateurs assignables
  if ('ids' in parsed.data) {
    const collaborateurs = await getCollaborateursAssignables({
      id: valideParId,
      role: sessionUser.role ?? '',
      serviceId: sessionUser.serviceId ?? null,
      directionId: sessionUser.directionId ?? null,
    })
    const assignables = new Set(collaborateurs.map((c) => c.id))
    if (employeIds.some((id) => !assignables.has(id))) {
      return apiError("Une ou plusieurs saisies ne sont pas dans votre périmètre", 403)
    }
  }

  try {
    const { count, ids: validatedIds } = await validerSaisiesByIds(
      saisies.map((s) => s.id),
      valideParId
    )
    return apiSuccess({ count, ids: validatedIds })
  } catch (e) {
    return apiError('Erreur lors de la validation', 500, e instanceof Error ? e.message : e)
  }
}
