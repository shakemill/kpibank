import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { catalogueKpiCreateSchema } from '@/lib/validations/kpi'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const actifParam = searchParams.get('actif')
  const typeParam = searchParams.get('type')
  try {
    const where: { actif?: boolean; type?: string } = {}
    if (actifParam === 'true') where.actif = true
    else if (actifParam === 'false') where.actif = false
    if (typeParam && ['QUANTITATIF', 'QUALITATIF', 'COMPORTEMENTAL'].includes(typeParam)) {
      where.type = typeParam
    }
    const list = await prisma.catalogueKpi.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { nom: 'asc' },
    })
    return NextResponse.json(list)
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }
  const parsed = catalogueKpiCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const userId = (result.session!.user as { id?: string }).id
  if (!userId) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }
  try {
    const catalogue = await prisma.catalogueKpi.create({
      data: {
        nom: parsed.data.nom,
        description: parsed.data.description ?? undefined,
        type: parsed.data.type,
        unite: parsed.data.unite ?? undefined,
        mode_agregation: parsed.data.mode_agregation,
        actif: parsed.data.actif ?? true,
      },
    })
    return NextResponse.json(catalogue)
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la création', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
