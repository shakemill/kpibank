import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireChefService } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import {
  calculerPoidsRestantService,
  calculerPoidsDansDirectionRestant,
} from '@/lib/kpi-utils'
import { kpiServiceUpdateSchema } from '@/lib/validations/kpi'

async function checkScope(
  result: { serviceId: number },
  kpiServiceId: number
): Promise<{ error: string; status: number } | null> {
  const existing = await prisma.kpiService.findUnique({
    where: { id: kpiServiceId },
    select: { serviceId: true },
  })
  if (!existing) return { error: 'KPI service introuvable', status: 404 }
  if (existing.serviceId !== result.serviceId) {
    return { error: 'Accès refusé à ce service', status: 403 }
  }
  return null
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionAndRequireChefService()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const id = parseInt((await params).id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }
  const serviceId = result.serviceId!
  const scopeError = await checkScope({ serviceId }, id)
  if (scopeError) return NextResponse.json({ error: scopeError.error }, { status: scopeError.status })
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }
  const parsed = kpiServiceUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const existing = await prisma.kpiService.findUnique({
    where: { id },
    select: {
      serviceId: true,
      periodeId: true,
      poids: true,
      kpiDirectionId: true,
      poids_dans_direction: true,
      statut: true,
    },
  })
  if (!existing) {
    return NextResponse.json({ error: 'KPI service introuvable' }, { status: 404 })
  }
  const newPoids = parsed.data.poids ?? existing.poids
  if (parsed.data.poids != null) {
    const poidsRestant = await calculerPoidsRestantService(
      existing.serviceId,
      existing.periodeId,
      id
    )
    if (newPoids > poidsRestant) {
      return NextResponse.json(
        { error: 'La somme des poids dépasserait 100%', poidsRestant },
        { status: 400 }
      )
    }
  }
  const newKpiDirectionId =
    parsed.data.kpiDirectionId !== undefined ? parsed.data.kpiDirectionId : existing.kpiDirectionId
  const newPoidsDansDirection =
    parsed.data.poids_dans_direction !== undefined
      ? parsed.data.poids_dans_direction
      : existing.poids_dans_direction
  if (newKpiDirectionId != null && newPoidsDansDirection != null) {
    const restantDir = await calculerPoidsDansDirectionRestant(newKpiDirectionId, id)
    if (newPoidsDansDirection > restantDir) {
      return NextResponse.json(
        {
          error: 'La contribution à ce KPI direction dépasserait 100%',
          poidsDansDirectionRestant: restantDir,
        },
        { status: 400 }
      )
    }
  }
  try {
    const kpi = await prisma.kpiService.update({
      where: { id },
      data: {
        ...(parsed.data.catalogueKpiId != null && { catalogueKpiId: parsed.data.catalogueKpiId }),
        ...(parsed.data.kpiDirectionId !== undefined && { kpiDirectionId: parsed.data.kpiDirectionId }),
        ...(parsed.data.poids_dans_direction !== undefined && {
          poids_dans_direction: parsed.data.poids_dans_direction,
        }),
        ...(parsed.data.cible !== undefined && { cible: parsed.data.cible }),
        ...(parsed.data.poids !== undefined && { poids: parsed.data.poids }),
        ...(parsed.data.statut != null && { statut: parsed.data.statut }),
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
    const poidsRestant = await calculerPoidsRestantService(existing.serviceId, existing.periodeId)
    return NextResponse.json({ ...kpi, poidsRestant: Math.round(poidsRestant * 100) / 100 })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionAndRequireChefService()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const id = parseInt((await params).id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }
  const serviceId = result.serviceId!
  const scopeError = await checkScope({ serviceId }, id)
  if (scopeError) return NextResponse.json({ error: scopeError.error }, { status: scopeError.status })
  try {
    await prisma.kpiService.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la suppression', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
