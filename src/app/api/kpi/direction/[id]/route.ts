import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDirecteur } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { calculerPoidsRestant } from '@/lib/kpi-utils'
import { kpiDirectionUpdateSchema } from '@/lib/validations/kpi'

async function checkScope(
  result: { directionId: number | null },
  kpiDirectionId: number
): Promise<{ error: string; status: number } | null> {
  const existing = await prisma.kpiDirection.findUnique({
    where: { id: kpiDirectionId },
    select: { directionId: true },
  })
  if (!existing) return { error: 'KPI direction introuvable', status: 404 }
  if (result.directionId != null && result.directionId !== existing.directionId) {
    return { error: 'Accès refusé à cette direction', status: 403 }
  }
  return null
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionAndRequireDirecteur()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const id = parseInt((await params).id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }
  const scopeError = await checkScope(result, id)
  if (scopeError) return NextResponse.json({ error: scopeError.error }, { status: scopeError.status })
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }
  const parsed = kpiDirectionUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const existing = await prisma.kpiDirection.findUnique({
    where: { id },
    select: { directionId: true, periodeId: true, poids: true, statut: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'KPI direction introuvable' }, { status: 404 })
  }
  const newPoids = parsed.data.poids ?? existing.poids
  if (parsed.data.poids != null) {
    const poidsRestant = await calculerPoidsRestant(
      existing.directionId,
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
  try {
    const kpi = await prisma.kpiDirection.update({
      where: { id },
      data: {
        ...(parsed.data.cible !== undefined && { cible: parsed.data.cible }),
        ...(parsed.data.poids !== undefined && { poids: parsed.data.poids }),
        ...(parsed.data.description_complementaire !== undefined && {
          description_complementaire: parsed.data.description_complementaire,
        }),
        ...(parsed.data.statut != null && { statut: parsed.data.statut }),
      },
      include: {
        catalogueKpi: true,
        periode: { select: { id: true, code: true, statut: true } },
        direction: { select: { id: true, nom: true, code: true } },
      },
    })
    const poidsRestant = await calculerPoidsRestant(existing.directionId, existing.periodeId)
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
  const result = await getSessionAndRequireDirecteur()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const id = parseInt((await params).id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }
  const scopeError = await checkScope(result, id)
  if (scopeError) return NextResponse.json({ error: scopeError.error }, { status: scopeError.status })
  const existing = await prisma.kpiDirection.findUnique({
    where: { id },
    select: {
      periode: { select: { statut: true } },
      kpiServices: {
        select: {
          kpiEmployes: {
            select: {
              statut: true,
              _count: { select: { saisiesMensuelles: true } },
            },
          },
        },
      },
    },
  })
  if (!existing) {
    return NextResponse.json({ error: 'KPI direction introuvable' }, { status: 404 })
  }
  const periodeStatut = existing.periode?.statut
  if (periodeStatut === 'EN_COURS' || periodeStatut === 'CLOTUREE') {
    return NextResponse.json(
      { error: 'Impossible de supprimer un KPI dont la période est en cours ou clôturée.' },
      { status: 400 }
    )
  }
  const hasRenseigne = existing.kpiServices.some((ks) =>
    ks.kpiEmployes.some(
      (ke) => ke.statut !== 'DRAFT' || (ke._count?.saisiesMensuelles ?? 0) > 0
    )
  )
  if (hasRenseigne) {
    return NextResponse.json(
      { error: 'Impossible de supprimer un KPI direction déjà renseigné ou lié à des KPI renseignés.' },
      { status: 400 }
    )
  }
  try {
    await prisma.kpiDirection.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la suppression', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
