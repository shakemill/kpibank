import { NextRequest } from 'next/server'
import { getSessionAndRequireDirecteur } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import {
  getStatutSaisie,
  calculerTauxAtteinte,
  isSaisieModifiable,
  type SensCalculKpi,
  type TypeKpi,
} from '@/lib/saisie-utils'
import {
  moisSaisissablePourFrequence,
  type FrequenceKpi,
} from '@/lib/kpi-cible-utils'
import { saisieDirectionCreateOrUpdateSchema } from '@/lib/validations/saisie'
import { canAccessKpiDirection, getDirectionIdForSaisie } from '@/lib/saisie-direction-access'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const result = await getSessionAndRequireDirecteur()
  if (result.error) return apiError(result.error, result.status)

  const user = result.session!.user as {
    id?: string
    role?: string
    directionId?: number | null
  }
  const { searchParams } = new URL(request.url)
  const moisParam = searchParams.get('mois')
  const anneeParam = searchParams.get('annee')
  const directionIdParam = searchParams.get('directionId')

  const mois = moisParam ? parseInt(moisParam, 10) : null
  const annee = anneeParam ? parseInt(anneeParam, 10) : null
  if (mois == null || annee == null || mois < 1 || mois > 12) {
    return apiError('mois et annee requis (1-12, 2020+)', 400)
  }

  let directionId = await getDirectionIdForSaisie(user)
  if (user.role === 'DG' && directionIdParam) {
    const id = parseInt(directionIdParam, 10)
    if (!Number.isNaN(id)) directionId = id
  }
  if (directionId == null && user.role !== 'DG') {
    return apiError("Votre compte n'est pas rattaché à une direction", 400)
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
        statut: 'EN_COURS',
        mois_debut: { lte: mois },
        mois_fin: { gte: mois },
        annee,
      },
      select: { id: true, mois_debut: true, mois_fin: true, annee: true, code: true },
      take: 1,
    })
    const periode = periodes[0] ?? null
    const periodeId = periode?.id ?? null

    const kpiDirectionsRaw =
      periodeId == null
        ? []
        : await prisma.kpiDirection.findMany({
            where: {
              periodeId,
              statut: 'ACTIF',
              ...(directionId != null ? { directionId } : {}),
            },
            include: {
              catalogueKpi: {
                select: {
                  id: true,
                  code: true,
                  nom: true,
                  type: true,
                  unite: true,
                  frequence: true,
                  sens_calcul: true,
                  categorie: true,
                },
              },
              periode: {
                select: { mois_debut: true, mois_fin: true, annee: true, code: true },
              },
              direction: { select: { id: true, nom: true } },
            },
            orderBy: { id: 'asc' },
          })

    const kpiDirectionIds = kpiDirectionsRaw.map((k) => k.id)
    const saisiesMoisCourant =
      kpiDirectionIds.length === 0
        ? []
        : await prisma.saisieDirection.findMany({
            where: { kpiDirectionId: { in: kpiDirectionIds }, mois, annee },
          })

    let saisiesPeriod: Array<{
      kpiDirectionId: number
      mois: number
      annee: number
      valeur_prevue: number | null
      valeur_realisee: number | null
      valeur_ajustee: number | null
      statut: string
    }> = []
    if (periode && kpiDirectionIds.length > 0) {
      saisiesPeriod = await prisma.saisieDirection.findMany({
        where: {
          kpiDirectionId: { in: kpiDirectionIds },
          annee: periode.annee,
          mois: { gte: periode.mois_debut, lte: periode.mois_fin },
        },
        select: {
          kpiDirectionId: true,
          mois: true,
          annee: true,
          valeur_prevue: true,
          valeur_realisee: true,
          valeur_ajustee: true,
          statut: true,
        },
      })
    }

    const kpiDirections = kpiDirectionsRaw
      .filter((kd) => {
        const freq = (kd.catalogueKpi.frequence ?? 'MENSUELLE') as FrequenceKpi
        if (!periode) return true
        return moisSaisissablePourFrequence(freq, mois, periode.mois_debut, periode.mois_fin)
      })
      .map((kd) => {
        const typeKpi = kd.catalogueKpi.type as TypeKpi
        const sensCalcul = (kd.catalogueKpi.sens_calcul ?? 'DIRECT') as SensCalculKpi
        const saisieMoisCourant = saisiesMoisCourant.find((s) => s.kpiDirectionId === kd.id)
        const valeur =
          saisieMoisCourant?.valeur_ajustee ?? saisieMoisCourant?.valeur_realisee ?? null
        const taux =
          valeur != null
            ? Math.round(calculerTauxAtteinte(valeur, kd.cible, typeKpi, sensCalcul) * 10) / 10
            : null

        const historique = periode
          ? Array.from(
              { length: periode.mois_fin - periode.mois_debut + 1 },
              (_, i) => {
                const m = periode.mois_debut + i
                const s = saisiesPeriod.find(
                  (x) => x.kpiDirectionId === kd.id && x.mois === m
                )
                const val = s?.valeur_ajustee ?? s?.valeur_realisee ?? null
                const t =
                  val != null
                    ? Math.round(
                        calculerTauxAtteinte(val, kd.cible, typeKpi, sensCalcul) * 10
                      ) / 10
                    : null
                return {
                  mois: m,
                  valeur_prevue: s?.valeur_prevue ?? null,
                  valeur: val,
                  taux: t,
                  statut: s?.statut ?? null,
                }
              }
            )
          : []

        return {
          id: kd.id,
          cible: kd.cible,
          poids: kd.poids,
          direction: kd.direction,
          catalogueKpi: kd.catalogueKpi,
          saisie_mois_courant: {
            id: saisieMoisCourant?.id ?? null,
            valeur_prevue: saisieMoisCourant?.valeur_prevue ?? null,
            valeur: valeur,
            statut: saisieMoisCourant?.statut ?? 'OUVERTE',
            commentaire: saisieMoisCourant?.commentaire ?? null,
            taux,
          },
          historique,
          periode_code: kd.periode.code,
        }
      })

    return apiSuccess({
      kpiDirections,
      statutPeriode,
      delaiJour: Number.isNaN(delaiJour) ? 10 : delaiJour,
      periode: periode
        ? {
            code: periode.code,
            mois_debut: periode.mois_debut,
            mois_fin: periode.mois_fin,
            annee: periode.annee,
          }
        : null,
      directionId,
    })
  } catch (e) {
    console.error('[GET /api/saisies-direction]', e)
    return apiError('Erreur serveur', 500, e instanceof Error ? e.message : e)
  }
}

export async function POST(request: NextRequest) {
  const result = await getSessionAndRequireDirecteur()
  if (result.error) return apiError(result.error, result.status)

  const user = result.session!.user as {
    id?: string
    role?: string
    directionId?: number | null
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Body JSON invalide', 400)
  }
  const parsed = saisieDirectionCreateOrUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('Données invalides', 400, parsed.error.flatten())
  }

  const allowed = await canAccessKpiDirection(parsed.data.kpiDirectionId, {
    id: user.id ?? '',
    role: user.role,
    directionId: user.directionId,
  })
  if (!allowed) return apiError('KPI direction introuvable ou accès refusé', 403)

  const kpiDir = await prisma.kpiDirection.findUnique({
    where: { id: parsed.data.kpiDirectionId },
    include: {
      catalogueKpi: { select: { frequence: true } },
      periode: { select: { mois_debut: true, mois_fin: true } },
    },
  })
  if (!kpiDir || kpiDir.statut !== 'ACTIF') {
    return apiError('KPI direction introuvable ou inactif', 404)
  }

  const freq = (kpiDir.catalogueKpi.frequence ?? 'MENSUELLE') as FrequenceKpi
  if (
    !moisSaisissablePourFrequence(
      freq,
      parsed.data.mois,
      kpiDir.periode.mois_debut,
      kpiDir.periode.mois_fin
    )
  ) {
    return apiError('Ce KPI n\'est pas saisissable pour ce mois (fréquence)', 400)
  }

  const delaiParam = await prisma.parametre.findUnique({
    where: { cle: 'DELAI_SAISIE_JOUR' },
    select: { valeur: true },
  })
  const delaiJour = delaiParam ? parseInt(delaiParam.valeur, 10) : 10
  const statutPeriode = getStatutSaisie(
    parsed.data.mois,
    parsed.data.annee,
    Number.isNaN(delaiJour) ? 10 : delaiJour
  )
  if (statutPeriode === 'VERROUILLEE') {
    return apiError('La période de saisie est clôturée', 403)
  }

  try {
    const existing = await prisma.saisieDirection.findUnique({
      where: {
        kpiDirectionId_mois_annee: {
          kpiDirectionId: parsed.data.kpiDirectionId,
          mois: parsed.data.mois,
          annee: parsed.data.annee,
        },
      },
    })

    const statut = statutPeriode === 'EN_RETARD' ? 'EN_RETARD' : 'OUVERTE'
    const data = {
      valeur_prevue: parsed.data.valeur_prevue ?? null,
      valeur_realisee: parsed.data.valeur_realisee ?? null,
      commentaire: parsed.data.commentaire ?? null,
      statut: statut as 'OUVERTE' | 'EN_RETARD',
      en_retard: statutPeriode === 'EN_RETARD',
    }

    if (existing) {
      if (!isSaisieModifiable(existing.statut)) {
        return apiError('Cette saisie ne peut plus être modifiée', 403)
      }
      const updated = await prisma.saisieDirection.update({
        where: { id: existing.id },
        data: {
          ...data,
          ...(existing.statut === 'REJETEE'
            ? {
                soumis_le: null,
                valide_le: null,
                valideParId: null,
                valeur_ajustee: null,
                motif_ajustement: null,
              }
            : {}),
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
      return apiSuccess(updated)
    }

    const created = await prisma.saisieDirection.create({
      data: {
        kpiDirectionId: parsed.data.kpiDirectionId,
        mois: parsed.data.mois,
        annee: parsed.data.annee,
        ...data,
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
    return apiSuccess(created)
  } catch (e) {
    return apiError(
      "Erreur lors de l'enregistrement",
      500,
      e instanceof Error ? e.message : e
    )
  }
}
