import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStatutSaisie } from '@/lib/saisie-utils'
import { apiSuccess, apiError } from '@/lib/api-response'

const MANAGER_ROLES = ['MANAGER', 'DG', 'DIRECTEUR', 'CHEF_SERVICE']

/**
 * GET /api/saisies/manquantes?mois=&annee=
 * Liste des employés (de l'équipe du manager) qui n'ont pas encore de saisie pour le mois donné.
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return apiError('Non authentifié', 401)
  const role = (session.user as { role?: string }).role ?? ''
  if (!MANAGER_ROLES.includes(role)) {
    return apiError('Accès réservé au manager', 403)
  }
  const managerId = parseInt((session.user as { id?: string }).id ?? '', 10)
  if (Number.isNaN(managerId)) return apiError('Session invalide', 401)

  const { searchParams } = new URL(request.url)
  const moisParam = searchParams.get('mois')
  const anneeParam = searchParams.get('annee')
  const now = new Date()
  const mois = moisParam ? parseInt(moisParam, 10) : now.getMonth() + 1
  const annee = anneeParam ? parseInt(anneeParam, 10) : now.getFullYear()
  if (Number.isNaN(mois) || mois < 1 || mois > 12 || Number.isNaN(annee)) {
    return apiError('mois et annee invalides', 400)
  }

  const delaiParam = await prisma.parametre.findUnique({
    where: { cle: 'DELAI_SAISIE_JOUR' },
    select: { valeur: true },
  })
  const delaiJour = delaiParam ? parseInt(delaiParam.valeur, 10) : 10
  const statutPeriode = getStatutSaisie(mois, annee, Number.isNaN(delaiJour) ? 10 : delaiJour)

  try {
    const periodes = await prisma.periode.findMany({
      where: {
        actif: true,
        mois_debut: { lte: mois },
        mois_fin: { gte: mois },
        annee,
      },
      select: { id: true },
      take: 1,
    })
    const periodeId = periodes[0]?.id
    if (!periodeId) {
      return apiSuccess({
        statutPeriode,
        manquantes: [],
        message: 'Aucune période active pour ce mois',
      })
    }

    const collaborateurs = await prisma.user.findMany({
      where: { managerId, role: 'EMPLOYE', actif: true },
      select: { id: true, nom: true, prenom: true, email: true },
    })
    const kpiValides = await prisma.kpiEmploye.findMany({
      where: {
        employeId: { in: collaborateurs.map((c) => c.id) },
        periodeId,
        statut: { in: ['VALIDE', 'CLOTURE'] },
      },
      select: { employeId: true },
    })
    const employeIdsAvecKpi = [...new Set(kpiValides.map((k) => k.employeId))]

    const saisiesExistantes = await prisma.saisieMensuelle.findMany({
      where: {
        employeId: { in: employeIdsAvecKpi },
        mois,
        annee,
        statut: { notIn: ['MANQUANTE'] },
      },
      select: { employeId: true },
    })
    const employeIdsAvecSaisie = new Set(saisiesExistantes.map((s) => s.employeId))

    const manquantes = collaborateurs
      .filter((c) => employeIdsAvecKpi.includes(c.id) && !employeIdsAvecSaisie.has(c.id))
      .map((c) => ({
        employeId: c.id,
        nom: c.nom,
        prenom: c.prenom,
        email: c.email,
      }))

    return apiSuccess({ mois, annee, statutPeriode, manquantes })
  } catch (e) {
    return apiError('Erreur serveur', 500, e instanceof Error ? e.message : e)
  }
}
