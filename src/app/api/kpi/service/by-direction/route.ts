import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET Liste des KPI Service (ACTIF) d'une direction pour la période.
 * Utilisé par un DIRECTEUR assignant des KPI à un CHEF_SERVICE (collaborateur).
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role ?? ''
  if (role !== 'DIRECTEUR' && role !== 'DG') {
    return NextResponse.json({ error: 'Accès réservé au Directeur ou DG' }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const directionIdParam = searchParams.get('directionId')
  const periodeIdParam = searchParams.get('periodeId')
  if (!directionIdParam || !periodeIdParam) {
    return NextResponse.json({ error: 'directionId et periodeId requis' }, { status: 400 })
  }
  const directionId = parseInt(directionIdParam, 10)
  const periodeId = parseInt(periodeIdParam, 10)
  if (Number.isNaN(directionId) || Number.isNaN(periodeId)) {
    return NextResponse.json({ error: 'IDs invalides' }, { status: 400 })
  }
  if (role === 'DIRECTEUR') {
    const userDirectionId = (session.user as { directionId?: number }).directionId
    if (userDirectionId == null || userDirectionId !== directionId) {
      return NextResponse.json({ error: 'Accès refusé à cette direction' }, { status: 403 })
    }
  }
  try {
    const list = await prisma.kpiService.findMany({
      where: {
        periodeId,
        statut: 'ACTIF',
        service: { directionId },
      },
      select: {
        id: true,
        cible: true,
        poids: true,
        catalogueKpiId: true,
        catalogueKpi: { select: { id: true, nom: true, type: true, unite: true } },
        service: { select: { id: true, nom: true, code: true } },
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
