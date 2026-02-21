import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireManager } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET Liste des KPI Service (ACTIF) d'un service, pour un manager dont au moins un collaborateur appartient à ce service.
 * Utilisé par la page Assignation pour le select "KPI Service" lors de l'assignation à un employé.
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
  const managerId = parseInt((result.session!.user as { id?: string }).id!, 10)
  const hasAccess = await prisma.user.findFirst({
    where: { managerId, serviceId },
    select: { id: true },
  })
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Aucun collaborateur de votre équipe n'appartient à ce service" },
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
