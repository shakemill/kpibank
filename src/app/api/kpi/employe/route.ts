import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSessionAndRequireManager } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { calculerPoidsRestantEmploye } from '@/lib/kpi-utils'
import { kpiEmployeCreateSchema } from '@/lib/validations/kpi'
import { notifierKpiAssigne } from '@/lib/notifications'
import { getCollaborateursAssignables, peutAssignerA } from '@/lib/assignation-rules'

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
    const { peutAssignerA } = await import('@/lib/assignation-rules')
    const sessionUser = session.user as { id?: string; role?: string; serviceId?: number | null; directionId?: number | null }
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
    // Liste des KPI de tous les collaborateurs assignables (périmètre organisationnel)
    const { getCollaborateursAssignables } = await import('@/lib/assignation-rules')
    const sessionUser = session.user as { id?: string; role?: string; serviceId?: number | null; directionId?: number | null }
    const collaborateurs = await getCollaborateursAssignables({
      id: userIdNum,
      role: sessionUser.role ?? '',
      serviceId: sessionUser.serviceId ?? null,
      directionId: sessionUser.directionId ?? null,
    })
    const ids = collaborateurs.map((c) => c.id)
    if (ids.length === 0) {
      return NextResponse.json({ list: [], equipe: true })
    }
    const where: {
      employeId: { in: number[] }
      periodeId?: number
      statut?: 'DRAFT' | 'NOTIFIE' | 'ACCEPTE' | 'CONTESTE' | 'MAINTENU' | 'REVISE' | 'VALIDE' | 'CLOTURE'
    } = {
      employeId: { in: ids },
    }
    if (periodeIdParam) {
      const periodeId = parseInt(periodeIdParam, 10)
      if (!Number.isNaN(periodeId)) where.periodeId = periodeId
    }
    const statutValues = ['DRAFT', 'NOTIFIE', 'ACCEPTE', 'CONTESTE', 'MAINTENU', 'REVISE', 'VALIDE', 'CLOTURE'] as const
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
        orderBy: [{ employeId: 'asc' }, { id: 'asc' }],
      })
      return NextResponse.json({ list, equipe: true })
    } catch (e) {
      return NextResponse.json(
        { error: 'Erreur serveur', details: e instanceof Error ? e.message : e },
        { status: 500 }
      )
    }
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
    return NextResponse.json({ list })
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
  const employe = await prisma.user.findUnique({
    where: { id: parsed.data.employeId },
    select: { id: true, managerId: true, serviceId: true, directionId: true, role: true },
  })
  if (!employe) {
    return NextResponse.json({ error: 'Destinataire introuvable' }, { status: 404 })
  }
  const autorise = await peutAssignerA(
    {
      id: assignateurId,
      role: user.role ?? '',
      serviceId: user.serviceId ?? null,
      directionId: user.directionId ?? null,
    },
    parsed.data.employeId
  )
  if (!autorise) {
    return NextResponse.json(
      { error: "Vous n'êtes pas autorisé à assigner des KPI à cet utilisateur" },
      { status: 403 }
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
      (employe.directionId != null && kpiService.service.directionId === employe.directionId)
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
      select: { id: true },
    })
    if (!catalogue) {
      return NextResponse.json({ error: 'Catalogue KPI introuvable' }, { status: 404 })
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

  const poidsRestant = await calculerPoidsRestantEmploye(
    parsed.data.employeId,
    parsed.data.periodeId
  )
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
    const assignateurNom = `${kpi.assignePar.prenom} ${kpi.assignePar.nom}`.trim() || 'Votre N+1'
    await notifierKpiAssigne(
      kpi.employeId,
      assignateurNom,
      user.role ?? '',
      kpi.catalogueKpi.nom,
      kpi.periode.code
    )
    const newRestant = await calculerPoidsRestantEmploye(parsed.data.employeId, parsed.data.periodeId)
    return NextResponse.json({ ...kpi, poidsRestant: Math.round(newRestant * 100) / 100 })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la création', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
