import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStatutSaisie } from '@/lib/saisie-utils'
import { notifierManagerNouvellesSaisies } from '@/lib/notifications'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return apiError('Non authentifié', 401)
  const userId = (session.user as { id?: string }).id
  if (!userId) return apiError('Session invalide', 401)
  const employeId = parseInt(userId, 10)
  if (Number.isNaN(employeId)) return apiError('Session invalide', 401)

  const id = parseInt((await context.params).id, 10)
  if (Number.isNaN(id)) return apiError('id invalide', 400)

  const saisie = await prisma.saisieMensuelle.findUnique({
    where: { id },
    include: {
      employe: { select: { managerId: true, actif: true } },
      kpiEmploye: { select: { catalogueKpi: { select: { type: true } } } },
    },
  })
  if (!saisie || saisie.employeId !== employeId) {
    return apiError('Saisie introuvable ou accès refusé', 404)
  }
  if (!saisie.employe.actif) {
    return apiError('Compte désactivé : les saisies sont gelées', 403)
  }

  if (saisie.statut === 'VALIDEE' || saisie.statut === 'AJUSTEE') {
    return apiError('Cette saisie est déjà validée pour ce mois', 403)
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
  if (valeur == null || (typeof valeur === 'number' && Number.isNaN(valeur))) {
    return apiError('Veuillez saisir une valeur réalisée avant de soumettre', 400)
  }

  try {
    const updated = await prisma.saisieMensuelle.update({
      where: { id },
      data: { statut: 'SOUMISE', soumis_le: new Date() },
      include: {
        kpiEmploye: {
          select: {
            id: true,
            cible: true,
            catalogueKpi: { select: { id: true, nom: true, type: true, unite: true } },
          },
        },
      },
    })

    if (saisie.employe.managerId) {
      await notifierManagerNouvellesSaisies(saisie.employe.managerId)
    }

    return apiSuccess(updated)
  } catch (e) {
    return apiError(
      'Erreur lors de la soumission',
      500,
      e instanceof Error ? e.message : e
    )
  }
}
