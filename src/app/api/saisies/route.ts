import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getStatutSaisie,
  calculerCibleMensuelle,
  calculerCibleAttenduADate,
  calculerRealiseCumule,
  calculerTauxAtteinte,
  type ModeAgregation,
  type TypeKpi,
  type SaisieMensuelleForCumul,
} from '@/lib/saisie-utils'
import { saisieCreateOrUpdateSchema } from '@/lib/validations/saisie'
import { canAccessEmployeData } from '@/lib/access-control'
import { apiSuccess, apiError } from '@/lib/api-response'

const MANAGER_ROLES = ['MANAGER', 'DG', 'DIRECTEUR', 'CHEF_SERVICE']

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return apiError('Non authentifié', 401)
  const userId = (session.user as { id?: string }).id
  if (!userId) return apiError('Session invalide', 401)
  const userIdNum = parseInt(userId, 10)
  const role = (session.user as { role?: string }).role ?? ''
  const { searchParams } = new URL(request.url)
  const userIdParam = searchParams.get('userId')
  const moisParam = searchParams.get('mois')
  const anneeParam = searchParams.get('annee')

  let targetEmployeId: number = userIdNum
  if (MANAGER_ROLES.includes(role) && userIdParam) {
    const id = parseInt(userIdParam, 10)
    if (Number.isNaN(id)) return apiError('userId invalide', 400)
    const allowed = await canAccessEmployeData(
      { id: userId, role, serviceId: (session.user as { serviceId?: number }).serviceId, directionId: (session.user as { directionId?: number }).directionId, managerId: (session.user as { managerId?: number }).managerId },
      id
    )
    if (!allowed) return apiError('Accès refusé à cet employé', 403)
    targetEmployeId = id
  } else if (role === 'EMPLOYE' && userIdParam && userIdParam !== userId) {
    return apiError('Accès refusé', 403)
  }

  const mois = moisParam ? parseInt(moisParam, 10) : null
  const annee = anneeParam ? parseInt(anneeParam, 10) : null
  if (mois == null || annee == null || mois < 1 || mois > 12) {
    return apiError('mois et annee requis (1-12, 2020+)', 400)
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
      select: { id: true, mois_debut: true, mois_fin: true, annee: true, code: true },
      take: 1,
    })
    const periode = periodes[0] ?? null
    const periodeId = periode?.id ?? null

    const kpiEmployesRaw =
      periodeId == null
        ? []
        : await prisma.kpiEmploye.findMany({
            where: {
              employeId: targetEmployeId,
              periodeId,
              statut: { in: ['VALIDE', 'CLOTURE'] },
            },
            include: {
              catalogueKpi: {
                select: { id: true, nom: true, type: true, unite: true, mode_agregation: true },
              },
              periode: {
                select: { mois_debut: true, mois_fin: true, annee: true, code: true },
              },
            },
            orderBy: { id: 'asc' },
          })

    const saisiesMoisCourant = await prisma.saisieMensuelle.findMany({
      where: { employeId: targetEmployeId, mois, annee },
      include: {
        kpiEmploye: {
          select: {
            id: true,
            cible: true,
            catalogueKpi: { select: { id: true, nom: true, type: true, unite: true } },
          },
        },
      },
      orderBy: { kpiEmployeId: 'asc' },
    })

    let saisiesPeriod: Array<{
      kpiEmployeId: number
      mois: number
      annee: number
      valeur_realisee: number | null
      valeur_ajustee: number | null
      statut: string
    }> = []
    if (periode) {
      saisiesPeriod = await prisma.saisieMensuelle.findMany({
        where: {
          employeId: targetEmployeId,
          annee: periode.annee,
          mois: { gte: periode.mois_debut, lte: periode.mois_fin },
        },
        select: {
          kpiEmployeId: true,
          mois: true,
          annee: true,
          valeur_realisee: true,
          valeur_ajustee: true,
          statut: true,
        },
      })
    }

    const kpiEmployes = kpiEmployesRaw.map((ke) => {
      const modeAgregation = (ke.catalogueKpi.mode_agregation ?? 'CUMUL') as ModeAgregation
      const periodeShape = {
        mois_debut: ke.periode.mois_debut,
        mois_fin: ke.periode.mois_fin,
      }
      const { cibleMois } = calculerCibleMensuelle(
        ke.cible,
        modeAgregation,
        periodeShape,
        mois
      )
      const cibleAttendueADate = calculerCibleAttenduADate(
        ke.cible,
        modeAgregation,
        periodeShape,
        mois
      )
      const saisiesKpi = saisiesPeriod
        .filter((s) => s.kpiEmployeId === ke.id)
        .map((s) => ({
          mois: s.mois,
          annee: s.annee,
          valeur_realisee: s.valeur_ajustee ?? s.valeur_realisee,
          statut: s.statut,
        })) as SaisieMensuelleForCumul[]
      const realiseCumule = calculerRealiseCumule(saisiesKpi, modeAgregation, mois)
      const tauxAvancementPeriode =
        cibleAttendueADate > 0
          ? Math.round((realiseCumule / cibleAttendueADate) * 1000) / 10
          : 0
      const moisRestants = Math.max(0, ke.periode.mois_fin - mois)
      const saisieMoisCourant = saisiesMoisCourant.find((s) => s.kpiEmployeId === ke.id)
      const historique = Array.from(
        { length: ke.periode.mois_fin - ke.periode.mois_debut + 1 },
        (_, i) => {
          const m = ke.periode.mois_debut + i
          const s = saisiesKpi.find((x) => x.mois === m)
          const valeur = s?.valeur_realisee ?? null
          const typeKpi = ke.catalogueKpi.type as TypeKpi
          const taux =
            valeur != null && cibleMois > 0
              ? Math.round(calculerTauxAtteinte(valeur, cibleMois, typeKpi) * 10) / 10
              : null
          return {
            mois: m,
            valeur,
            cible: Math.round(cibleMois * 100) / 100,
            taux,
            statut: s?.statut ?? null,
          }
        }
      )
      return {
        id: ke.id,
        cible: ke.cible,
        poids: ke.poids,
        catalogueKpi: {
          id: ke.catalogueKpi.id,
          nom: ke.catalogueKpi.nom,
          type: ke.catalogueKpi.type,
          unite: ke.catalogueKpi.unite,
        },
        cible_periode: ke.cible,
        mode_agregation: modeAgregation,
        cible_mensuelle: Math.round(cibleMois * 100) / 100,
        cible_attendue_a_date: cibleAttendueADate,
        realise_cumule: Math.round(realiseCumule * 100) / 100,
        taux_avancement_periode: tauxAvancementPeriode,
        mois_restants: moisRestants,
        saisie_mois_courant: {
          valeur: saisieMoisCourant?.valeur_ajustee ?? saisieMoisCourant?.valeur_realisee ?? null,
          statut: saisieMoisCourant?.statut ?? 'OUVERTE',
          cible_ce_mois: Math.round(cibleMois * 100) / 100,
        },
        historique,
        periode_code: ke.periode.code,
        periode_nb_mois: ke.periode.mois_fin - ke.periode.mois_debut + 1,
      }
    })

    return apiSuccess({
      kpiEmployes,
      saisies: saisiesMoisCourant,
      statutPeriode,
      delaiJour: Number.isNaN(delaiJour) ? 10 : delaiJour,
      periode: periode ? { code: periode.code, mois_debut: periode.mois_debut, mois_fin: periode.mois_fin, annee: periode.annee } : null,
    })
  } catch (e) {
    return apiError('Erreur serveur', 500, e instanceof Error ? e.message : e)
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return apiError('Non authentifié', 401)
  const userId = (session.user as { id?: string }).id
  if (!userId) return apiError('Session invalide', 401)
  const employeId = parseInt(userId, 10)
  if (Number.isNaN(employeId)) return apiError('Session invalide', 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Body JSON invalide', 400)
  }
  const parsed = saisieCreateOrUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('Données invalides', 400, parsed.error.flatten())
  }

  const delaiParam = await prisma.parametre.findUnique({
    where: { cle: 'DELAI_SAISIE_JOUR' },
    select: { valeur: true },
  })
  const delaiJour = delaiParam ? parseInt(delaiParam.valeur, 10) : 10
  const { getStatutSaisie: getStatut } = await import('@/lib/saisie-utils')
  const statutPeriode = getStatut(
    parsed.data.mois,
    parsed.data.annee,
    Number.isNaN(delaiJour) ? 10 : delaiJour
  )
  if (statutPeriode === 'VERROUILLEE') {
    return apiError('La période de saisie est clôturée', 403)
  }

  const kpiEmploye = await prisma.kpiEmploye.findUnique({
    where: { id: parsed.data.kpiEmployeId },
    select: { employeId: true, catalogueKpi: { select: { type: true } } },
  })
  if (!kpiEmploye || kpiEmploye.employeId !== employeId) {
    return apiError('KPI employé introuvable ou accès refusé', 403)
  }

  try {
    const existing = await prisma.saisieMensuelle.findUnique({
      where: {
        kpiEmployeId_mois_annee: {
          kpiEmployeId: parsed.data.kpiEmployeId,
          mois: parsed.data.mois,
          annee: parsed.data.annee,
        },
      },
    })

    const data: {
      kpiEmployeId: number
      employeId: number
      mois: number
      annee: number
      valeur_realisee?: number | null
      commentaire?: string | null
      preuves?: string | null
      statut?: 'OUVERTE' | 'EN_RETARD'
      en_retard?: boolean
    } = {
      kpiEmployeId: parsed.data.kpiEmployeId,
      employeId,
      mois: parsed.data.mois,
      annee: parsed.data.annee,
      valeur_realisee: parsed.data.valeur_realisee ?? null,
      commentaire: parsed.data.commentaire ?? null,
      preuves: parsed.data.preuves ?? null,
      statut: statutPeriode === 'EN_RETARD' ? 'EN_RETARD' : 'OUVERTE',
      en_retard: statutPeriode === 'EN_RETARD',
    }

    if (existing) {
      if (!['OUVERTE', 'EN_RETARD'].includes(existing.statut)) {
        return apiError('Cette saisie ne peut plus être modifiée', 403)
      }
      const updated = await prisma.saisieMensuelle.update({
        where: { id: existing.id },
        data: {
          valeur_realisee: data.valeur_realisee,
          commentaire: data.commentaire,
          preuves: data.preuves,
          statut: data.statut,
          en_retard: data.en_retard,
        },
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
      return apiSuccess(updated)
    }

    const created = await prisma.saisieMensuelle.create({
      data: {
        ...data,
        statut: data.statut!,
      },
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
    return apiSuccess(created)
  } catch (e) {
    return apiError(
      "Erreur lors de l'enregistrement",
      500,
      e instanceof Error ? e.message : e
    )
  }
}
