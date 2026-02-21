import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireChefService } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import {
  calculerPoidsRestantService,
  validerSommePoidsService,
} from '@/lib/kpi-utils'

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

export async function POST(
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
  const existing = await prisma.kpiService.findUnique({
    where: { id },
    select: { serviceId: true, periodeId: true, poids: true, statut: true, periode: { select: { statut: true } } },
  })
  if (!existing) {
    return NextResponse.json({ error: 'KPI service introuvable' }, { status: 404 })
  }
  if (existing.periode?.statut === 'CLOTUREE') {
    return NextResponse.json({ error: 'Impossible de modifier un KPI dont la période est clôturée' }, { status: 403 })
  }
  if (existing.statut === 'ACTIF') {
    return NextResponse.json({ error: 'Ce KPI est déjà actif' }, { status: 400 })
  }
  const poidsRestant = await calculerPoidsRestantService(
    existing.serviceId,
    existing.periodeId,
    id
  )
  if (existing.poids > poidsRestant) {
    return NextResponse.json(
      {
        error:
          "Impossible d'activer : la somme des poids des KPI actifs doit être 100%. Ajustez les poids.",
      },
      { status: 400 }
    )
  }
  try {
    await prisma.kpiService.update({
      where: { id },
      data: { statut: 'ACTIF' },
    })
    const valid = await validerSommePoidsService(existing.serviceId, existing.periodeId)
    return NextResponse.json({ success: true, sommeValide: valid })
  } catch (e) {
    return NextResponse.json(
      { error: "Erreur lors de l'activation", details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
