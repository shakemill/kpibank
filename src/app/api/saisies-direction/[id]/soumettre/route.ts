import { NextRequest } from 'next/server'
import { getSessionAndRequireDirecteur } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { getStatutSaisie } from '@/lib/saisie-utils'
import { canAccessKpiDirection } from '@/lib/saisie-direction-access'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const result = await getSessionAndRequireDirecteur()
  if (result.error) return apiError(result.error, result.status)

  const user = result.session!.user as {
    id?: string
    role?: string
    directionId?: number | null
  }

  const id = parseInt((await context.params).id, 10)
  if (Number.isNaN(id)) return apiError('id invalide', 400)

  const saisie = await prisma.saisieDirection.findUnique({
    where: { id },
    include: { kpiDirection: { select: { directionId: true } } },
  })
  if (!saisie) return apiError('Saisie introuvable', 404)

  const allowed = await canAccessKpiDirection(saisie.kpiDirectionId, {
    id: user.id ?? '',
    role: user.role,
    directionId: user.directionId,
  })
  if (!allowed) return apiError('Accès refusé', 403)

  if (saisie.statut === 'VALIDEE' || saisie.statut === 'AJUSTEE') {
    return apiError('Cette saisie est déjà validée', 403)
  }
  if (!['OUVERTE', 'EN_RETARD'].includes(saisie.statut)) {
    return apiError('Cette saisie ne peut plus être soumise', 403)
  }

  const delaiParam = await prisma.parametre.findUnique({
    where: { cle: 'DELAI_SAISIE_JOUR' },
    select: { valeur: true },
  })
  const delaiJour = delaiParam ? parseInt(delaiParam.valeur, 10) : 10
  const statutPeriode = getStatutSaisie(
    saisie.mois,
    saisie.annee,
    Number.isNaN(delaiJour) ? 10 : delaiJour
  )
  if (statutPeriode === 'VERROUILLEE') {
    return apiError('La période de saisie est clôturée', 403)
  }

  const valeur = saisie.valeur_ajustee ?? saisie.valeur_realisee
  if (valeur == null || Number.isNaN(valeur)) {
    return apiError('Veuillez saisir une valeur réalisée avant de soumettre', 400)
  }

  try {
    const updated = await prisma.saisieDirection.update({
      where: { id },
      data: { statut: 'SOUMISE', soumis_le: new Date() },
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
    return apiSuccess(updated)
  } catch (e) {
    return apiError('Erreur lors de la soumission', 500, e instanceof Error ? e.message : e)
  }
}
