import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { catalogueKpiUpdateSchema } from '@/lib/validations/kpi'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const id = parseInt((await params).id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }
  const parsed = catalogueKpiUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  try {
    const catalogue = await prisma.catalogueKpi.update({
      where: { id },
      data: {
        ...(parsed.data.code !== undefined && { code: parsed.data.code }),
        ...(parsed.data.nom != null && { nom: parsed.data.nom }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.objectif_qualite !== undefined && { objectif_qualite: parsed.data.objectif_qualite }),
        ...(parsed.data.formule !== undefined && { formule: parsed.data.formule }),
        ...(parsed.data.type != null && { type: parsed.data.type }),
        ...(parsed.data.categorie !== undefined && { categorie: parsed.data.categorie }),
        ...(parsed.data.frequence !== undefined && { frequence: parsed.data.frequence }),
        ...(parsed.data.sens_calcul != null && { sens_calcul: parsed.data.sens_calcul }),
        ...(parsed.data.portee != null && { portee: parsed.data.portee }),
        ...(parsed.data.unite !== undefined && { unite: parsed.data.unite }),
        ...(parsed.data.mode_agregation != null && { mode_agregation: parsed.data.mode_agregation }),
        ...(parsed.data.actif !== undefined && { actif: parsed.data.actif }),
      },
    })
    return NextResponse.json(catalogue)
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
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const id = parseInt((await params).id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }
  try {
    await prisma.catalogueKpi.update({
      where: { id },
      data: { actif: false },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la désactivation', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
