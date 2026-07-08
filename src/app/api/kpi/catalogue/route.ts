import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { catalogueKpiCreateSchema } from '@/lib/validations/kpi'
import { canAccessDirectionCatalogue } from '@/lib/user-direction'
import type { PorteeKpi } from '@/generated/prisma/client'

const MANAGER_ROLES = ['MANAGER', 'DG', 'DIRECTEUR', 'CHEF_SERVICE']

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const actifParam = searchParams.get('actif')
  const typeParam = searchParams.get('type')
  const porteeParam = searchParams.get('portee')
  const directionIdParam = searchParams.get('directionId')

  if (directionIdParam) {
    const directionId = parseInt(directionIdParam, 10)
    if (Number.isNaN(directionId)) {
      return NextResponse.json({ error: 'directionId invalide' }, { status: 400 })
    }
    const user = session.user as {
      id?: string
      role?: string
      serviceId?: number | null
      directionId?: number | null
    }
    const role = user.role ?? ''
    if (!MANAGER_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    const assignateurId = parseInt(user.id ?? '', 10)
    if (Number.isNaN(assignateurId)) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
    }
    const allowed = await canAccessDirectionCatalogue(
      {
        id: assignateurId,
        role,
        serviceId: user.serviceId ?? null,
        directionId: user.directionId ?? null,
      },
      directionId
    )
    if (!allowed) {
      return NextResponse.json(
        { error: "Vous n'avez pas accès au catalogue de cette direction" },
        { status: 403 }
      )
    }

    const catalogueWhere: {
      actif?: boolean
      type?: string
      portee?: PorteeKpi | { in: PorteeKpi[] }
    } = {}
    if (actifParam === 'true') catalogueWhere.actif = true
    else if (actifParam === 'false') catalogueWhere.actif = false
    if (typeParam && ['QUANTITATIF', 'QUALITATIF', 'COMPORTEMENTAL'].includes(typeParam)) {
      catalogueWhere.type = typeParam
    }
    if (porteeParam && ['DIRECTION', 'SERVICE', 'INDIVIDUEL'].includes(porteeParam)) {
      catalogueWhere.portee = porteeParam as PorteeKpi
    } else {
      catalogueWhere.portee = { in: ['INDIVIDUEL', 'SERVICE'] }
    }

    try {
      const rows = await prisma.directionCatalogueKpi.findMany({
        where: { directionId, catalogueKpi: catalogueWhere },
        include: { catalogueKpi: true },
        orderBy: { catalogueKpi: { nom: 'asc' } },
      })
      return NextResponse.json(rows.map((r) => r.catalogueKpi))
    } catch (e) {
      return NextResponse.json(
        { error: 'Erreur serveur', details: e instanceof Error ? e.message : e },
        { status: 500 }
      )
    }
  }

  try {
    const where: { actif?: boolean; type?: string; portee?: PorteeKpi } = {}
    if (actifParam === 'true') where.actif = true
    else if (actifParam === 'false') where.actif = false
    if (typeParam && ['QUANTITATIF', 'QUALITATIF', 'COMPORTEMENTAL'].includes(typeParam)) {
      where.type = typeParam
    }
    if (porteeParam && ['DIRECTION', 'SERVICE', 'INDIVIDUEL'].includes(porteeParam)) {
      where.portee = porteeParam as PorteeKpi
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
        code: parsed.data.code ?? undefined,
        nom: parsed.data.nom,
        description: parsed.data.description ?? undefined,
        objectif_qualite: parsed.data.objectif_qualite ?? undefined,
        formule: parsed.data.formule ?? undefined,
        type: parsed.data.type,
        categorie: parsed.data.categorie ?? undefined,
        frequence: parsed.data.frequence ?? undefined,
        sens_calcul: parsed.data.sens_calcul ?? 'DIRECT',
        portee: parsed.data.portee ?? 'INDIVIDUEL',
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
