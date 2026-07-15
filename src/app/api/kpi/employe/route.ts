import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSessionAndRequireManager } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { calculerPoidsRestantEmploye } from '@/lib/kpi-utils'
import { kpiEmployeCreateSchema } from '@/lib/validations/kpi'
import { peutAssignerA, getCollaborateursAssignables } from '@/lib/assignation-rules'
import {
  isCatalogueKpiAllowedForDirection,
  resolveUserDirectionId,
} from '@/lib/user-direction'
import {
  enrichirRealisationsKpi,
  enrichirRealisationsParMois,
  calculerScoreParMois,
  labelMoisPeriode,
  listerMoisPeriode,
  moisReferenceDansPeriode,
} from '@/lib/kpi-realisations'
import { consolidateEmploye } from '@/lib/consolidation'
import { AuditAction, auditFromRequest } from '@/lib/audit-log'

const MANAGER_ROLES = ['MANAGER', 'DG', 'DIRECTEUR', 'CHEF_SERVICE']

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role ?? ''
  const userId = (session.user as { id?: string }).id
  if (!userId) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }
  const userIdNum = parseInt(userId, 10)
  if (Number.isNaN(userIdNum)) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const employeIdParam = searchParams.get('employeId')
  const periodeIdParam = searchParams.get('periodeId')
  const statutParam = searchParams.get('statut')

  const sessionUser = session.user as { id?: string; role?: string; serviceId?: number | null; directionId?: number | null }

  // Cas spécial : page Contestations — liste des KPI contestés de toute l'équipe du manager
  if (MANAGER_ROLES.includes(role) && !employeIdParam && statutParam === 'CONTESTE') {
    const collaborateurs = await getCollaborateursAssignables({
      id: userIdNum,
      role: sessionUser.role ?? '',
      serviceId: sessionUser.serviceId ?? null,
      directionId: sessionUser.directionId ?? null,
    })
    const employeIds = collaborateurs.map((c) => c.id)
    if (employeIds.length === 0) {
      return NextResponse.json({ list: [] })
    }
    try {
      const list = await prisma.kpiEmploye.findMany({
        where: {
          employeId: { in: employeIds },
          statut: 'CONTESTE',
        },
        include: {
          catalogueKpi: true,
          kpiService: { include: { catalogueKpi: { select: { nom: true } }, service: { select: { nom: true, code: true } } } },
          periode: { select: { id: true, code: true, statut: true } },
          employe: { select: { id: true, nom: true, prenom: true, email: true } },
          assignePar: { select: { id: true, nom: true, prenom: true } },
        },
        orderBy: [{ employeId: 'asc' }, { id: 'asc' }],
      })
      return NextResponse.json({ list })
    } catch (e) {
      return NextResponse.json(
        { error: 'Erreur serveur', details: e instanceof Error ? e.message : e },
        { status: 500 }
      )
    }
  }

  let targetEmployeId: number | null = null
  if (role === 'EMPLOYE') {
    targetEmployeId = userIdNum
  } else if (MANAGER_ROLES.includes(role) && employeIdParam) {
    const employeId = parseInt(employeIdParam, 10)
    if (Number.isNaN(employeId)) {
      return NextResponse.json({ error: 'employeId invalide' }, { status: 400 })
    }
    const employe = await prisma.user.findUnique({
      where: { id: employeId },
      select: { id: true, managerId: true, role: true },
    })
    const autorise = await peutAssignerA(
      {
        id: userIdNum,
        role: sessionUser.role ?? '',
        serviceId: sessionUser.serviceId ?? null,
        directionId: sessionUser.directionId ?? null,
      },
      employeId
    )
    if (!employe || !autorise) {
      return NextResponse.json({ error: 'Accès refusé à cet employé' }, { status: 403 })
    }
    targetEmployeId = employeId
  } else if (MANAGER_ROLES.includes(role) && !employeIdParam) {
    // "Mes KPI personnels" : retourner les KPI de l'utilisateur connecté (comme pour un employé)
    targetEmployeId = userIdNum
  } else {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  const statutValues = ['DRAFT', 'NOTIFIE', 'ACCEPTE', 'CONTESTE', 'MAINTENU', 'REVISE', 'VALIDE', 'CLOTURE'] as const
  const where: {
    employeId: number
    periodeId?: number
    statut?: (typeof statutValues)[number]
  } = {
    employeId: targetEmployeId,
  }
  if (periodeIdParam) {
    const periodeId = parseInt(periodeIdParam, 10)
    if (!Number.isNaN(periodeId)) where.periodeId = periodeId
  }
  if (statutParam && statutValues.includes(statutParam as (typeof statutValues)[number])) {
    where.statut = statutParam as (typeof statutValues)[number]
  }
  try {
    const list = await prisma.kpiEmploye.findMany({
      where,
      include: {
        catalogueKpi: true,
        kpiService: { include: { catalogueKpi: { select: { nom: true } }, service: { select: { nom: true, code: true } } } },
        periode: { select: { id: true, code: true, statut: true } },
        employe: { select: { id: true, nom: true, prenom: true, email: true } },
        assignePar: { select: { id: true, nom: true, prenom: true } },
      },
      orderBy: { id: 'asc' },
    })

    if (!where.periodeId || list.length === 0) {
      return NextResponse.json({ list, realisationsMois: null })
    }

    const periode = await prisma.periode.findUnique({
      where: { id: where.periodeId },
      select: { mois_debut: true, mois_fin: true, annee: true },
    })
    if (!periode) {
      return NextResponse.json({ list, realisationsMois: null })
    }

    const moisCourant = moisReferenceDansPeriode(periode)
    const saisies = await prisma.saisieMensuelle.findMany({
      where: {
        employeId: targetEmployeId,
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
      const consolidation = await consolidateEmploye(targetEmployeId, where.periodeId!, {
        includeSoumises: true,
      })
      scoreGlobal = Math.round(consolidation.scoreGlobal * 100) / 100
    } catch {
      scoreGlobal = null
    }

    return NextResponse.json({
      list: listAvecMois,
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
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const result = await getSessionAndRequireManager()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }
  const parsed = kpiEmployeCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const user = result.session!.user as { id?: string; role?: string; serviceId?: number | null; directionId?: number | null }
  const assignateurId = parseInt(user.id ?? '', 10)
  if (Number.isNaN(assignateurId)) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }
  const assignateur = {
    id: assignateurId,
    role: user.role ?? '',
    serviceId: user.serviceId ?? null,
    directionId: user.directionId ?? null,
  }
  const autorise = await peutAssignerA(assignateur, parsed.data.employeId)
  if (!autorise) {
    return NextResponse.json(
      { error: "Vous n'êtes pas autorisé à assigner des KPI à cet utilisateur" },
      { status: 403 }
    )
  }

  const [employe, poidsRestant] = await Promise.all([
    prisma.user.findUnique({
      where: { id: parsed.data.employeId },
      select: {
        id: true,
        managerId: true,
        serviceId: true,
        directionId: true,
        role: true,
        service: { select: { directionId: true } },
      },
    }),
    calculerPoidsRestantEmploye(parsed.data.employeId, parsed.data.periodeId),
  ])
  if (!employe) {
    return NextResponse.json({ error: 'Destinataire introuvable' }, { status: 404 })
  }
  const employeDirectionId = resolveUserDirectionId(employe)
  if (employeDirectionId == null) {
    return NextResponse.json(
      { error: "L'utilisateur doit être rattaché à une direction pour recevoir des KPI" },
      { status: 400 }
    )
  }
  let catalogueKpiId: number
  let kpiServiceId: number | null = null

  if (parsed.data.kpiServiceId != null) {
    const kpiService = await prisma.kpiService.findUnique({
      where: { id: parsed.data.kpiServiceId },
      select: { serviceId: true, catalogueKpiId: true, service: { select: { directionId: true } } },
    })
    if (!kpiService) {
      return NextResponse.json({ error: 'KPI service introuvable' }, { status: 404 })
    }
    const kpiAppartientAuDestinataire =
      (employe.serviceId != null && kpiService.serviceId === employe.serviceId) ||
      kpiService.service.directionId === employeDirectionId
    if (!kpiAppartientAuDestinataire) {
      return NextResponse.json(
        { error: 'Ce KPI n\'appartient pas au service ou à la direction du destinataire' },
        { status: 403 }
      )
    }
    catalogueKpiId = kpiService.catalogueKpiId
    kpiServiceId = parsed.data.kpiServiceId
  } else {
    if (parsed.data.catalogueKpiId == null) {
      return NextResponse.json({ error: 'kpiServiceId ou catalogueKpiId requis' }, { status: 400 })
    }
    const catalogue = await prisma.catalogueKpi.findUnique({
      where: { id: parsed.data.catalogueKpiId },
      select: { id: true, actif: true },
    })
    if (!catalogue) {
      return NextResponse.json({ error: 'Catalogue KPI introuvable' }, { status: 404 })
    }
    if (!catalogue.actif) {
      return NextResponse.json({ error: 'Ce KPI catalogue est inactif' }, { status: 400 })
    }
    const allowedForDirection = await isCatalogueKpiAllowedForDirection(
      employeDirectionId,
      parsed.data.catalogueKpiId
    )
    if (!allowedForDirection) {
      return NextResponse.json(
        { error: "Ce KPI n'est pas disponible pour la direction de cet utilisateur" },
        { status: 403 }
      )
    }
    catalogueKpiId = parsed.data.catalogueKpiId
    if (parsed.data.kpiServiceId != null) {
      const refExists = await prisma.kpiService.findUnique({
        where: { id: parsed.data.kpiServiceId },
        select: { id: true },
      })
      if (refExists) kpiServiceId = parsed.data.kpiServiceId
    }
  }

  if (parsed.data.poids > poidsRestant) {
    return NextResponse.json(
      { error: 'La somme des poids dépasserait 100%', poidsRestant },
      { status: 400 }
    )
  }
  try {
    const kpi = await prisma.kpiEmploye.create({
      data: {
        catalogueKpiId,
        employeId: parsed.data.employeId,
        assigneParId: assignateurId,
        kpiServiceId,
        periodeId: parsed.data.periodeId,
        cible: parsed.data.cible,
        poids: parsed.data.poids,
        statut: 'DRAFT',
      },
      include: {
        catalogueKpi: true,
        kpiService: { include: { catalogueKpi: { select: { nom: true } } } },
        periode: { select: { id: true, code: true, statut: true } },
        employe: { select: { id: true, nom: true, prenom: true } },
        assignePar: { select: { id: true, nom: true, prenom: true } },
      },
    })
    const newRestant = Math.max(0, poidsRestant - parsed.data.poids)
    await auditFromRequest(request, {
      userId: user.id,
      action: AuditAction.KPI_ASSIGN,
      entityType: 'KpiEmploye',
      entityId: kpi.id,
      details: `employeId=${parsed.data.employeId} · periodeId=${parsed.data.periodeId}`,
    })
    return NextResponse.json({ ...kpi, poidsRestant: Math.round(newRestant * 100) / 100 })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la création', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
