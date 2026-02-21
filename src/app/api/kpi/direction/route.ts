import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDirecteur } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { calculerPoidsRestant } from '@/lib/kpi-utils'
import { kpiDirectionCreateSchema } from '@/lib/validations/kpi'

const includeKpiDirection = {
  catalogueKpi: true,
  periode: { select: { id: true, code: true, statut: true, date_debut: true, date_fin: true } },
  direction: { select: { id: true, nom: true, code: true } },
  kpiServices: {
    include: { service: { select: { id: true, nom: true, code: true } } },
  },
} as const

async function getKpiDirectionPayload(directionId: number, periodeId: number) {
  const list = await prisma.kpiDirection.findMany({
    where: { directionId, periodeId },
    include: includeKpiDirection,
    orderBy: { id: 'asc' },
  })
  const poidsUtilise = list
    .filter((k) => k.statut === 'ACTIF')
    .reduce((s, k) => s + k.poids, 0)
  const poidsRestant = await calculerPoidsRestant(directionId, periodeId)
  return {
    list,
    poidsUtilise: Math.round(poidsUtilise * 100) / 100,
    poidsRestant: Math.round(poidsRestant * 100) / 100,
  }
}

export async function GET(request: NextRequest) {
  const result = await getSessionAndRequireDirecteur()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { searchParams } = new URL(request.url)
  const periodeIdParam = searchParams.get('periodeId')
  const queryDirectionId = searchParams.get('directionId')

  if (!periodeIdParam) {
    return NextResponse.json({ error: 'periodeId requis' }, { status: 400 })
  }
  const periodeId = parseInt(periodeIdParam, 10)
  if (Number.isNaN(periodeId)) {
    return NextResponse.json({ error: 'periodeId invalide' }, { status: 400 })
  }

  const role = (result.session!.user as { role?: string }).role
  const isDG = role === 'DG'

  let directionId: number | null = null

  if (isDG) {
    // DG : directionId depuis la query (optionnel)
    if (queryDirectionId) {
      const id = parseInt(queryDirectionId, 10)
      if (!Number.isNaN(id)) directionId = id
    }
    if (directionId == null) {
      // Aucun directionId fourni → retourner les KPI de toutes les directions
      try {
        const directions = await prisma.direction.findMany({
          where: { actif: true },
          select: { id: true, nom: true },
          orderBy: { nom: 'asc' },
        })
        const directionsPayload = await Promise.all(
          directions.map(async (dir) => {
            const payload = await getKpiDirectionPayload(dir.id, periodeId)
            return {
              directionId: dir.id,
              directionNom: dir.nom,
              ...payload,
            }
          })
        )
        return NextResponse.json({
          allDirections: true,
          directions: directionsPayload,
        })
      } catch (e) {
        return NextResponse.json(
          { error: 'Erreur serveur', details: e instanceof Error ? e.message : e },
          { status: 500 }
        )
      }
    }
    // DG avec directionId → une seule direction
  } else {
    // DIRECTEUR : directionId de la session
    directionId = result.directionId
    if (directionId == null) {
      return NextResponse.json(
        { error: "Votre compte n'est pas rattaché à une direction" },
        { status: 400 }
      )
    }
    if (queryDirectionId && parseInt(queryDirectionId, 10) !== directionId) {
      return NextResponse.json({ error: 'Accès refusé à cette direction' }, { status: 403 })
    }
  }

  try {
    const payload = await getKpiDirectionPayload(directionId, periodeId)
    return NextResponse.json(payload)
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const result = await getSessionAndRequireDirecteur()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }
  console.log('[KPI-DIR] POST reçu', body)
  const parsed = kpiDirectionCreateSchema.safeParse(body)
  if (!parsed.success) {
    console.log('[KPI-DIR] Validation zod échouée', parsed.error.flatten())
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  console.log('[KPI-DIR] Validation zod ok', parsed.data)
  const role = (result.session!.user as { role?: string }).role
  const isDG = role === 'DG'
  let directionId: number | null = null
  if (isDG) {
    directionId = parsed.data.directionId ?? null
    if (directionId == null) {
      return NextResponse.json(
        { error: 'directionId requis pour la vue DG (à envoyer dans le body)' },
        { status: 400 }
      )
    }
  } else {
    directionId = result.directionId
    if (directionId == null) {
      return NextResponse.json(
        { error: "Votre compte n'est pas rattaché à une direction" },
        { status: 400 }
      )
    }
    if (parsed.data.directionId != null && parsed.data.directionId !== directionId) {
      return NextResponse.json({ error: 'Accès refusé à cette direction' }, { status: 403 })
    }
  }
  const poidsRestant = await calculerPoidsRestant(directionId, parsed.data.periodeId)
  const restant = Math.round(poidsRestant * 100) / 100
  if (parsed.data.poids > poidsRestant) {
    return NextResponse.json(
      { error: `Poids insuffisant. Poids restant disponible : ${restant}%` },
      { status: 422 }
    )
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
    const kpi = await prisma.kpiDirection.create({
      data: {
        catalogueKpiId: parsed.data.catalogueKpiId,
        directionId,
        periodeId: parsed.data.periodeId,
        cible: parsed.data.cible,
        poids: parsed.data.poids,
        description_complementaire: parsed.data.description_complementaire ?? undefined,
        statut: 'DRAFT',
        creeParId: userIdNum,
      },
      include: {
        catalogueKpi: true,
        periode: { select: { id: true, code: true, statut: true } },
        direction: { select: { id: true, nom: true, code: true } },
      },
    })
    const newRestant = await calculerPoidsRestant(directionId, parsed.data.periodeId)
    console.log('[KPI-DIR] Résultat création', kpi.id)
    return NextResponse.json({ ...kpi, poidsRestant: Math.round(newRestant * 100) / 100 })
  } catch (e) {
    console.error('[KPI-DIR] Erreur création', e)
    return NextResponse.json(
      { error: 'Erreur lors de la création', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
