import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG, getSessionAndRequireDirecteur } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { directionCatalogueKpiAssignSchema } from '@/lib/validations/organisation'
import {
  listDirectionCatalogueKpis,
  catalogueKpiSelect,
  canRemoveDirectionCatalogueKpi,
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

    const catalogueKpiId = parsed.data.catalogueKpiId
    const catalogue = await prisma.catalogueKpi.findUnique({
      where: { id: catalogueKpiId },
      select: catalogueKpiSelect,
    })
    if (!catalogue) {
      return NextResponse.json({ error: 'KPI catalogue introuvable' }, { status: 404 })
    }
    if (!catalogue.actif) {
      return NextResponse.json({ error: 'Ce KPI catalogue est inactif' }, { status: 400 })
    }

    const toResponse = async (row: { id: number; catalogueKpiId: number; createdAt: Date }) => {
      const check = await canRemoveDirectionCatalogueKpi(directionId, row.catalogueKpiId)
      return {
        id: row.id,
        catalogueKpiId: row.catalogueKpiId,
        createdAt: row.createdAt,
        catalogueKpi: catalogue,
        canRemove: check.allowed,
        removeBlockedReason: check.reason ?? null,
      }
    }

    // Idempotent : si déjà lié, renvoyer le lien existant (évite les faux 409).
    const existing = await prisma.directionCatalogueKpi.findFirst({
      where: { directionId, catalogueKpiId },
      select: { id: true, catalogueKpiId: true, createdAt: true },
    })
    if (existing) {
      return NextResponse.json(await toResponse(existing))
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

    try {
      const created = await prisma.directionCatalogueKpi.create({
        data: {
          directionId,
          catalogueKpiId,
          ...(creeParIdValid != null ? { creeParId: creeParIdValid } : {}),
        },
        select: { id: true, catalogueKpiId: true, createdAt: true },
      })
      return NextResponse.json(await toResponse(created))
    } catch (createErr) {
      const code =
        createErr && typeof createErr === 'object' && 'code' in createErr
          ? String((createErr as { code: unknown }).code)
          : null
      // Course concurrente : un autre appel a créé le même lien entre-temps.
      if (code === 'P2002') {
        const raced = await prisma.directionCatalogueKpi.findFirst({
          where: { directionId, catalogueKpiId },
          select: { id: true, catalogueKpiId: true, createdAt: true },
        })
        if (raced) {
          return NextResponse.json(await toResponse(raced))
        }
        const meta =
          createErr && typeof createErr === 'object' && 'meta' in createErr
            ? (createErr as { meta?: { target?: string[] } }).meta
            : undefined
        return NextResponse.json(
          {
            error: 'Contrainte d’unicité violée lors de l’affectation',
            details: createErr instanceof Error ? createErr.message : String(createErr),
            code,
            target: meta?.target ?? null,
          },
          { status: 409 }
        )
      }
      throw createErr
    }
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
