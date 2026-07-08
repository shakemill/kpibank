import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireManager } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { peutAssignerA } from '@/lib/assignation-rules'
import { consolidateEmploye } from '@/lib/consolidation'
import { resolveUserDirectionId } from '@/lib/user-direction'
import {
  enrichirRealisationsKpi,
  enrichirRealisationsParMois,
  calculerScoreParMois,
  labelMoisPeriode,
  listerMoisPeriode,
  moisReferenceDansPeriode,
} from '@/lib/kpi-realisations'

const kpiEmployeInclude = {
  catalogueKpi: {
    select: {
      id: true,
      nom: true,
      unite: true,
      type: true,
      mode_agregation: true,
      sens_calcul: true,
    },
  },
  kpiService: { select: { id: true } },
} as const

const kpiServiceSelect = {
  id: true,
  cible: true,
  poids: true,
  catalogueKpiId: true,
  catalogueKpi: { select: { id: true, nom: true, type: true, unite: true } },
  service: { select: { id: true, nom: true, code: true } },
} as const

type KpiListItem = Awaited<
  ReturnType<typeof prisma.kpiEmploye.findMany<{ include: typeof kpiEmployeInclude }>>
>[number]

async function buildResponse(
  employe: object,
  list: KpiListItem[],
  kpiServiceOptions: object[],
  catalogueOptions: object[],
  periodeId: number
) {
  const periode = await prisma.periode.findUnique({
    where: { id: periodeId },
    select: { mois_debut: true, mois_fin: true, annee: true },
  })

  if (!periode || list.length === 0) {
    return NextResponse.json({
      employe,
      list,
      kpiServiceOptions,
      catalogueOptions,
      realisationsMois: null,
      performance: null,
    })
  }

  const moisCourant = moisReferenceDansPeriode(periode)
  const employeId = (employe as { id: number }).id
  const saisies = await prisma.saisieMensuelle.findMany({
    where: {
      employeId,
      annee: periode.annee,
      mois: { gte: periode.mois_debut, lte: periode.mois_fin },
    },
    select: {
      kpiEmployeId: true,
      mois: true,
      valeur_realisee: true,
      valeur_ajustee: true,
      statut: true,
    },
  })

  const listEnrichie = enrichirRealisationsKpi(list, saisies, periode, moisCourant)
  const listAvecMois = enrichirRealisationsParMois(listEnrichie, saisies, periode)
  const moisPeriode = listerMoisPeriode(periode)
  const scoreParMois = calculerScoreParMois(list, saisies, periode)

  let scoreGlobal: number | null = null
  try {
    const consolidation = await consolidateEmploye(employeId, periodeId, { includeSoumises: true })
    scoreGlobal = Math.round(consolidation.scoreGlobal * 100) / 100
  } catch {
    scoreGlobal = null
  }

  return NextResponse.json({
    employe,
    list: listAvecMois,
    kpiServiceOptions,
    catalogueOptions,
    realisationsMois: {
      mois: moisCourant,
      annee: periode.annee,
      label: labelMoisPeriode(periode, moisCourant),
    },
    performance: {
      scoreGlobal,
      scoreParMois,
      moisPeriode,
    },
  })
}

/**
 * GET Contexte assignation pour un employé : profil, KPI assignés, options catalogue/service.
 * Une seule requête HTTP remplace plusieurs appels séquentiels côté client.
 */
export async function GET(request: NextRequest) {
  const result = await getSessionAndRequireManager()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const sessionUser = result.session!.user as {
    id?: string
    role?: string
    serviceId?: number | null
    directionId?: number | null
  }
  const assignateurId = parseInt(sessionUser.id ?? '', 10)
  if (Number.isNaN(assignateurId)) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const employeId = parseInt(searchParams.get('employeId') ?? '', 10)
  const periodeId = parseInt(searchParams.get('periodeId') ?? '', 10)
  if (Number.isNaN(employeId) || Number.isNaN(periodeId)) {
    return NextResponse.json({ error: 'employeId et periodeId requis' }, { status: 400 })
  }

  const assignateur = {
    id: assignateurId,
    role: sessionUser.role ?? '',
    serviceId: sessionUser.serviceId ?? null,
    directionId: sessionUser.directionId ?? null,
  }

  const autorise = await peutAssignerA(assignateur, employeId)
  if (!autorise) {
    return NextResponse.json({ error: 'Accès refusé à cet employé' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { id: employeId, actif: true },
    select: {
      id: true,
      nom: true,
      prenom: true,
      role: true,
      serviceId: true,
      directionId: true,
      service: {
        select: {
          id: true,
          nom: true,
          code: true,
          directionId: true,
          direction: { select: { id: true, nom: true, code: true } },
        },
      },
      direction: { select: { id: true, nom: true, code: true } },
      manager: { select: { id: true, nom: true, prenom: true } },
    },
  })
  if (!user) {
    return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })
  }

  const effectiveDirectionId = resolveUserDirectionId(user)
  const effectiveDirection =
    user.direction ??
    user.service?.direction ??
    null

  const employe = {
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    role: user.role,
    serviceId: user.serviceId,
    directionId: effectiveDirectionId,
    service: user.service
      ? { id: user.service.id, nom: user.service.nom, code: user.service.code }
      : null,
    direction: effectiveDirection
      ? { id: effectiveDirection.id, nom: effectiveDirection.nom, code: effectiveDirection.code }
      : null,
    manager: user.manager,
  }

  const kpiListPromise = prisma.kpiEmploye.findMany({
    where: { employeId, periodeId },
    include: kpiEmployeInclude,
    orderBy: { id: 'asc' },
  })

  if (effectiveDirectionId == null) {
    const list = await kpiListPromise
    return buildResponse(employe, list, [], [], periodeId)
  }

  const rattacheDirect = user.directionId != null && user.serviceId == null
  const loadServiceKpis =
    user.serviceId != null
      ? prisma.kpiService.findMany({
          where: { serviceId: user.serviceId, periodeId, statut: 'ACTIF' },
          select: kpiServiceSelect,
          orderBy: { id: 'asc' },
        })
      : rattacheDirect || user.role === 'DIRECTEUR' || user.role === 'CHEF_SERVICE'
        ? prisma.kpiService.findMany({
            where: {
              statut: 'ACTIF',
              periodeId,
              service: { directionId: effectiveDirectionId },
            },
            select: kpiServiceSelect,
            orderBy: { id: 'asc' },
          })
        : Promise.resolve([])

  const cataloguePromise = prisma.directionCatalogueKpi.findMany({
    where: {
      directionId: effectiveDirectionId,
      catalogueKpi: {
        actif: true,
        portee: { in: ['INDIVIDUEL', 'SERVICE'] },
      },
    },
    include: {
      catalogueKpi: {
        select: { id: true, nom: true, type: true, unite: true },
      },
    },
    orderBy: { catalogueKpi: { nom: 'asc' } },
  })

  const [list, kpiServiceOptions, catalogueRows] = await Promise.all([
    kpiListPromise,
    loadServiceKpis,
    cataloguePromise,
  ])

  return buildResponse(
    employe,
    list,
    kpiServiceOptions,
    catalogueRows.map((r) => r.catalogueKpi),
    periodeId
  )
}
