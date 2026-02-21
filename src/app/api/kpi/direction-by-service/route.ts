import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireChefService } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET Liste des KPI Direction (ACTIF) pour la direction du service du chef.
 * Utilisé par la page KPI Service pour le select "KPI Direction parent".
 */
export async function GET(request: NextRequest) {
  const result = await getSessionAndRequireChefService()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { searchParams } = new URL(request.url)
  const periodeIdParam = searchParams.get('periodeId')
  if (!periodeIdParam) {
    return NextResponse.json({ error: 'periodeId requis' }, { status: 400 })
  }
  const periodeId = parseInt(periodeIdParam, 10)
  if (Number.isNaN(periodeId)) {
    return NextResponse.json({ error: 'periodeId invalide' }, { status: 400 })
  }
  const service = await prisma.service.findUnique({
    where: { id: result.serviceId },
    select: { directionId: true },
  })
  if (!service) {
    return NextResponse.json({ error: 'Service introuvable' }, { status: 404 })
  }
  try {
    const list = await prisma.kpiDirection.findMany({
      where: { directionId: service.directionId, periodeId, statut: 'ACTIF' },
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
