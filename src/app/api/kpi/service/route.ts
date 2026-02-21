import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireChefService } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import {
  calculerPoidsRestantService,
  calculerPoidsDansDirectionRestant,
} from '@/lib/kpi-utils'
import { kpiServiceCreateSchema } from '@/lib/validations/kpi'

export async function GET(request: NextRequest) {
  const result = await getSessionAndRequireChefService()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
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
  const serviceId = (serviceIdParam ? parseInt(serviceIdParam, 10) : result.serviceId) as number
  if (Number.isNaN(serviceId) || serviceId !== result.serviceId) {
    return NextResponse.json({ error: 'Accès refusé à ce service' }, { status: 403 })
  }
  try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, nom: true, code: true },
    })
    const list = await prisma.kpiService.findMany({
      where: { serviceId, periodeId },
      include: {
        catalogueKpi: true,
        periode: { select: { id: true, code: true, statut: true, date_debut: true, date_fin: true } },
        kpiDirection: {
          select: {
            id: true,
            cible: true,
            poids: true,
            catalogueKpi: { select: { nom: true } },
            direction: { select: { nom: true } },
          },
        },
        service: { select: { id: true, nom: true, code: true } },
      },
      orderBy: { id: 'asc' },
    })
    const poidsUtilise = list
      .filter((k) => k.statut === 'ACTIF')
      .reduce((s, k) => s + k.poids, 0)
    const poidsRestant = await calculerPoidsRestantService(serviceId, periodeId)
    const contributionParDirection: Record<number, number> = {}
    for (const k of list) {
      if (k.kpiDirectionId != null) {
        contributionParDirection[k.kpiDirectionId] =
          (contributionParDirection[k.kpiDirectionId] ?? 0) + (k.poids_dans_direction ?? 0)
      }
    }
    return NextResponse.json({
      serviceNom: service?.nom ?? null,
      serviceCode: service?.code ?? null,
      list,
      poidsUtilise: Math.round(poidsUtilise * 100) / 100,
      poidsRestant: Math.round(poidsRestant * 100) / 100,
      contributionParDirection,
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const result = await getSessionAndRequireChefService()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }
  const parsed = kpiServiceCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const serviceId = (parsed.data.serviceId ?? result.serviceId) as number
  if (serviceId !== result.serviceId) {
    return NextResponse.json({ error: 'Accès refusé à ce service' }, { status: 403 })
  }
  const poidsRestant = await calculerPoidsRestantService(serviceId, parsed.data.periodeId)
  if (parsed.data.poids > poidsRestant) {
    return NextResponse.json(
      { error: 'La somme des poids dépasserait 100%', poidsRestant },
      { status: 400 }
    )
  }
  if (
    parsed.data.kpiDirectionId != null &&
    parsed.data.poids_dans_direction != null
  ) {
    const restantDir = await calculerPoidsDansDirectionRestant(parsed.data.kpiDirectionId)
    if (parsed.data.poids_dans_direction > restantDir) {
      return NextResponse.json(
        {
          error: 'La contribution à ce KPI direction dépasserait 100%',
          poidsDansDirectionRestant: restantDir,
        },
        { status: 400 }
      )
    }
  }
  const userId = (result.session!.user as { id?: string }).id
  if (!userId) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }
  const userIdNum = parseInt(userId, 10)
  if (Number.isNaN(userIdNum)) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }
  try {
    const kpi = await prisma.kpiService.create({
      data: {
        catalogueKpiId: parsed.data.catalogueKpiId,
        serviceId: result.serviceId,
        periodeId: parsed.data.periodeId,
        kpiDirectionId: parsed.data.kpiDirectionId ?? undefined,
        poids_dans_direction: parsed.data.poids_dans_direction ?? undefined,
        cible: parsed.data.cible,
        poids: parsed.data.poids,
        statut: 'DRAFT',
        creeParId: userIdNum,
      },
      include: {
        catalogueKpi: true,
        periode: { select: { id: true, code: true, statut: true } },
        kpiDirection: {
          select: {
            id: true,
            cible: true,
            poids: true,
            catalogueKpi: { select: { nom: true } },
            direction: { select: { nom: true } },
          },
        },
        service: { select: { id: true, nom: true, code: true } },
      },
    })
    const newRestant = await calculerPoidsRestantService(result.serviceId, parsed.data.periodeId)
    return NextResponse.json({ ...kpi, poidsRestant: Math.round(newRestant * 100) / 100 })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la création', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
