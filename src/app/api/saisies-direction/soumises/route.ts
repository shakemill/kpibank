import { NextRequest } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { calculerTauxAtteinte, type SensCalculKpi, type TypeKpi } from '@/lib/saisie-utils'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const result = await getSessionAndRequireDG()
  if (result.error) return apiError(result.error, result.status)

  const { searchParams } = new URL(request.url)
  const moisParam = searchParams.get('mois')
  const anneeParam = searchParams.get('annee')
  const directionIdParam = searchParams.get('directionId')
  const now = new Date()
  const mois = moisParam ? parseInt(moisParam, 10) : now.getMonth() + 1
  const annee = anneeParam ? parseInt(anneeParam, 10) : now.getFullYear()
  if (Number.isNaN(mois) || mois < 1 || mois > 12 || Number.isNaN(annee)) {
    return apiError('mois et annee invalides', 400)
  }

  const directionFilter =
    directionIdParam && !Number.isNaN(parseInt(directionIdParam, 10))
      ? { directionId: parseInt(directionIdParam, 10) }
      : {}

  const list = await prisma.saisieDirection.findMany({
    where: {
      mois,
      annee,
      statut: 'SOUMISE',
      kpiDirection: directionFilter,
    },
    include: {
      kpiDirection: {
        select: {
          id: true,
          cible: true,
          direction: { select: { id: true, nom: true } },
          catalogueKpi: {
            select: { id: true, nom: true, type: true, unite: true, sens_calcul: true },
          },
        },
      },
    },
    orderBy: [{ kpiDirectionId: 'asc' }, { id: 'asc' }],
  })

  const withTaux = list.map((s) => {
    const valeur = s.valeur_ajustee ?? s.valeur_realisee ?? 0
    const cible = s.kpiDirection.cible
    const type = s.kpiDirection.catalogueKpi.type as TypeKpi
    const sensCalcul = (s.kpiDirection.catalogueKpi.sens_calcul ?? 'DIRECT') as SensCalculKpi
    const taux = calculerTauxAtteinte(valeur, cible, type, sensCalcul)
    return { ...s, valeur_affichée: valeur, taux }
  })

  return apiSuccess({ list: withTaux, mois, annee })
}
