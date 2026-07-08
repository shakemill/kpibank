import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireManager } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { getCollaborateursAssignables } from '@/lib/assignation-rules'

/**
 * GET Liste des KPI Service (ACTIF) d'un service.
 * Accès : manager avec collaborateur dans le service, directeur de la direction, ou DG.
 */
export async function GET(request: NextRequest) {
  const result = await getSessionAndRequireManager()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { searchParams } = new URL(request.url)
  const serviceIdParam = searchParams.get('serviceId')
  const periodeIdParam = searchParams.get('periodeId')
  if (!serviceIdParam || !periodeIdParam) {
    return NextResponse.json({ error: 'serviceId et periodeId requis' }, { status: 400 })
  }
  const serviceId = parseInt(serviceIdParam, 10)
  const periodeId = parseInt(periodeIdParam, 10)
  if (Number.isNaN(serviceId) || Number.isNaN(periodeId)) {
    return NextResponse.json({ error: 'IDs invalides' }, { status: 400 })
  }

  const user = result.session!.user as {
    id?: string
    role?: string
    serviceId?: number | null
    directionId?: number | null
  }
  const assignateurId = parseInt(user.id ?? '', 10)
  if (Number.isNaN(assignateurId)) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, directionId: true },
  })
  if (!service) {
    return NextResponse.json({ error: 'Service introuvable' }, { status: 404 })
  }

  const role = user.role ?? ''
  let hasAccess = false
  if (role === 'DG') {
    hasAccess = true
  } else if (role === 'DIRECTEUR') {
    hasAccess = user.directionId != null && user.directionId === service.directionId
  } else if (role === 'CHEF_SERVICE') {
    hasAccess = user.serviceId === serviceId
  } else {
    const collaborateurs = await getCollaborateursAssignables({
      id: assignateurId,
      role,
      serviceId: user.serviceId ?? null,
      directionId: user.directionId ?? null,
    })
    hasAccess = collaborateurs.some((c) => c.serviceId === serviceId)
  }

  if (!hasAccess) {
    return NextResponse.json(
      { error: "Vous n'avez pas accès aux KPI de ce service" },
      { status: 403 }
    )
  }

  try {
    const list = await prisma.kpiService.findMany({
      where: { serviceId, periodeId, statut: 'ACTIF' },
      select: {
        id: true,
        cible: true,
        poids: true,
        catalogueKpiId: true,
        catalogueKpi: { select: { id: true, nom: true, type: true, unite: true } },
      },
      orderBy: { id: 'asc' },
    })
    return NextResponse.json(list)
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
