import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG, getSessionAndRequireDirecteur } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { directionCatalogueKpiAssignSchema } from '@/lib/validations/organisation'
import {
  listDirectionCatalogueKpis,
  catalogueKpiSelect,
} from '@/lib/direction-catalogue-kpi'

async function parseDirectionId(params: Promise<{ id: string }>) {
  const id = parseInt((await params).id, 10)
  if (Number.isNaN(id)) return null
  return id
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const directionId = await parseDirectionId(params)
  if (directionId == null) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const dgResult = await getSessionAndRequireDG()
  if (dgResult.error) {
    const dirResult = await getSessionAndRequireDirecteur()
    if (dirResult.error) {
      return NextResponse.json({ error: dirResult.error }, { status: dirResult.status })
    }
    if (dirResult.directionId !== directionId) {
      return NextResponse.json({ error: 'Accès refusé à cette direction' }, { status: 403 })
    }
  }

  try {
    const direction = await prisma.direction.findUnique({
      where: { id: directionId },
      select: { id: true },
    })
    if (!direction) {
      return NextResponse.json({ error: 'Direction introuvable' }, { status: 404 })
    }
    const list = await listDirectionCatalogueKpis(directionId)
    return NextResponse.json(list)
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const directionId = await parseDirectionId(params)
  if (directionId == null) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }
  const parsed = directionCatalogueKpiAssignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  try {
    const direction = await prisma.direction.findUnique({
      where: { id: directionId },
      select: { id: true },
    })
    if (!direction) {
      return NextResponse.json({ error: 'Direction introuvable' }, { status: 404 })
    }

    const catalogue = await prisma.catalogueKpi.findUnique({
      where: { id: parsed.data.catalogueKpiId },
      select: { id: true, actif: true, portee: true },
    })
    if (!catalogue) {
      return NextResponse.json({ error: 'KPI catalogue introuvable' }, { status: 404 })
    }
    if (!catalogue.actif) {
      return NextResponse.json({ error: 'Ce KPI catalogue est inactif' }, { status: 400 })
    }
    const existing = await prisma.directionCatalogueKpi.findUnique({
      where: {
        directionId_catalogueKpiId: {
          directionId,
          catalogueKpiId: parsed.data.catalogueKpiId,
        },
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Ce KPI est déjà affecté à cette direction' },
        { status: 409 }
      )
    }

    const userId = (result.session!.user as { id?: string }).id
    const creeParId = userId ? parseInt(userId, 10) : null
    let creeParIdValid: number | undefined
    if (creeParId != null && !Number.isNaN(creeParId)) {
      const creeur = await prisma.user.findUnique({
        where: { id: creeParId },
        select: { id: true },
      })
      if (creeur) creeParIdValid = creeur.id
    }

    const created = await prisma.directionCatalogueKpi.create({
      data: {
        directionId,
        catalogueKpiId: parsed.data.catalogueKpiId,
        ...(creeParIdValid != null ? { creeParId: creeParIdValid } : {}),
      },
      include: {
        catalogueKpi: { select: catalogueKpiSelect },
      },
    })

    return NextResponse.json({
      id: created.id,
      catalogueKpiId: created.catalogueKpiId,
      createdAt: created.createdAt,
      catalogueKpi: created.catalogueKpi,
      canRemove: true,
      removeBlockedReason: null,
    })
  } catch (e) {
    console.error('[KPI-CATALOGUE] Affectation échouée:', e)
    const code =
      e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : null
    const message = e instanceof Error ? e.message : String(e)

    if (code === 'P2021' || code === 'P2022') {
      return NextResponse.json(
        {
          error:
            'Schéma base de données incomplet. Relancez le déploiement Coolify pour appliquer les migrations (prisma migrate deploy).',
          details: message,
          code,
        },
        { status: 500 }
      )
    }
    if (code === 'P2002') {
      return NextResponse.json(
        { error: 'Ce KPI est déjà affecté à cette direction', code },
        { status: 409 }
      )
    }
    if (code === 'P2003') {
      return NextResponse.json(
        {
          error: 'Référence invalide (direction, KPI ou utilisateur).',
          details: message,
          code,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Erreur lors de l'affectation", details: message },
      { status: 500 }
    )
  }
}
