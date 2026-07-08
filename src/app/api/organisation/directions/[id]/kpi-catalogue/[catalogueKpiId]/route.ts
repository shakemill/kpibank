import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { canRemoveDirectionCatalogueKpi } from '@/lib/direction-catalogue-kpi'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; catalogueKpiId: string }> }
) {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const resolved = await params
  const directionId = parseInt(resolved.id, 10)
  const catalogueKpiId = parseInt(resolved.catalogueKpiId, 10)
  if (Number.isNaN(directionId) || Number.isNaN(catalogueKpiId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }
  try {
    const row = await prisma.directionCatalogueKpi.findUnique({
      where: {
        directionId_catalogueKpiId: { directionId, catalogueKpiId },
      },
    })
    if (!row) {
      return NextResponse.json({ error: 'Affectation introuvable' }, { status: 404 })
    }

    const check = await canRemoveDirectionCatalogueKpi(directionId, catalogueKpiId)
    if (!check.allowed) {
      return NextResponse.json({ error: check.reason ?? 'Retrait impossible' }, { status: 409 })
    }

    await prisma.directionCatalogueKpi.delete({ where: { id: row.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors du retrait', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
