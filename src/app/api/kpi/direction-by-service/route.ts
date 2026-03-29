import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireChefService, getSessionAndRequireDirecteur } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET Liste des KPI Direction (ACTIF) pour la direction du service.
 * Utilisé par la page KPI Service pour le select "KPI Direction parent".
 * Accepte Chef de service (service issu de la session) ou Directeur/DG (serviceId en query, service de leur direction).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const periodeIdParam = searchParams.get('periodeId')
  const serviceIdParam = searchParams.get('serviceId')
  if (!periodeIdParam) {
    return NextResponse.json({ error: 'periodeId requis' }, { status: 400 })
  }
  const periodeId = parseInt(periodeIdParam, 10)
  if (Number.isNaN(periodeId)) {
    return NextResponse.json({ error: 'periodeId invalide' }, { status: 400 })
  }

  let directionId: number
  const chefResult = await getSessionAndRequireChefService()
  if (!chefResult.error) {
    const service = await prisma.service.findUnique({
      where: { id: chefResult.serviceId },
      select: { directionId: true },
    })
    if (!service?.directionId) {
      return NextResponse.json({ error: 'Service sans direction' }, { status: 404 })
    }
    directionId = service.directionId
  } else {
    const dirResult = await getSessionAndRequireDirecteur()
    if (dirResult.error) {
      return NextResponse.json({ error: dirResult.error }, { status: dirResult.status })
    }
    if (!serviceIdParam) {
      return NextResponse.json({ error: 'serviceId requis pour le Directeur' }, { status: 400 })
    }
    const serviceId = parseInt(serviceIdParam, 10)
    if (Number.isNaN(serviceId)) {
      return NextResponse.json({ error: 'serviceId invalide' }, { status: 400 })
    }
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { directionId: true },
    })
    if (!service?.directionId) {
      return NextResponse.json({ error: 'Service introuvable ou sans direction' }, { status: 404 })
    }
    if (dirResult.directionId != null && service.directionId !== dirResult.directionId) {
      return NextResponse.json({ error: 'Accès refusé à ce service' }, { status: 403 })
    }
    directionId = service.directionId
  }

  try {
    const list = await prisma.kpiDirection.findMany({
      where: { directionId, periodeId, statut: 'ACTIF' },
      select: {
        id: true,
        cible: true,
        poids: true,
        catalogueKpi: { select: { id: true, nom: true } },
        direction: { select: { nom: true } },
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
