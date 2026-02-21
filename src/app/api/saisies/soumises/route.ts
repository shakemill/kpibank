import { NextRequest } from 'next/server'
import { getSessionAndRequireManager } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { getCollaborateursAssignables } from '@/lib/assignation-rules'
import { calculerTauxAtteinte, type TypeKpi } from '@/lib/saisie-utils'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const result = await getSessionAndRequireManager()
  if (result.error) return apiError(result.error, result.status)
  const user = result.session!.user as { id?: string; role?: string; serviceId?: number | null; directionId?: number | null }
  const assignateurId = parseInt(user.id ?? '', 10)
  if (Number.isNaN(assignateurId)) return apiError('Session invalide', 401)

  const { searchParams } = new URL(request.url)
  const moisParam = searchParams.get('mois')
  const anneeParam = searchParams.get('annee')
  const employeIdParam = searchParams.get('employeId')
  const now = new Date()
  const mois = moisParam ? parseInt(moisParam, 10) : now.getMonth() + 1
  const annee = anneeParam ? parseInt(anneeParam, 10) : now.getFullYear()
  if (Number.isNaN(mois) || mois < 1 || mois > 12 || Number.isNaN(annee)) {
    return apiError('mois et annee invalides', 400)
  }

  const collaborateurs = await getCollaborateursAssignables({
    id: assignateurId,
    role: user.role ?? '',
    serviceId: user.serviceId ?? null,
    directionId: user.directionId ?? null,
  })
  let employeIds = collaborateurs.map((c) => c.id)
  if (employeIdParam) {
    const eid = parseInt(employeIdParam, 10)
    if (!Number.isNaN(eid) && employeIds.includes(eid)) employeIds = [eid]
    else employeIds = []
  }
  if (employeIds.length === 0) {
    return apiSuccess({ list: [], mois, annee })
  }

  const list = await prisma.saisieMensuelle.findMany({
    where: {
      employeId: { in: employeIds },
      mois,
      annee,
      statut: 'SOUMISE',
    },
    include: {
      employe: { select: { id: true, nom: true, prenom: true, email: true } },
      kpiEmploye: {
        select: {
          id: true,
          cible: true,
          catalogueKpi: { select: { id: true, nom: true, type: true, unite: true } },
        },
      },
    },
    orderBy: [{ employeId: 'asc' }, { id: 'asc' }],
  })

  const withTaux = list.map((s) => {
    const valeur = s.valeur_ajustee ?? s.valeur_realisee ?? 0
    const cible = s.kpiEmploye.cible
    const type = s.kpiEmploye.catalogueKpi.type as TypeKpi
    const taux = calculerTauxAtteinte(valeur, cible, type)
    return {
      ...s,
      valeur_affichée: valeur,
      taux,
    }
  })

  return apiSuccess({ list: withTaux, mois, annee })
}
