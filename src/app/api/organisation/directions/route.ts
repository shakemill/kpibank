import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { directionCreateSchema } from '@/lib/validations/organisation'
import { estDirecteurAdjoint } from '@/lib/directeur-adjoint-utils'

export async function GET(request: NextRequest) {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { searchParams } = new URL(request.url)
  const etablissementId = searchParams.get('etablissementId')
  const actifParam = searchParams.get('actif')
  try {
    let where: { etablissementId?: number; actif?: boolean } = {}
    if (etablissementId) {
      where.etablissementId = parseInt(etablissementId, 10)
    } else {
      const first = await prisma.etablissement.findFirst({ select: { id: true } })
      if (first) where.etablissementId = first.id
    }
    if (actifParam === 'true') where.actif = true
    else if (actifParam === 'false') where.actif = false
    const directions = await prisma.direction.findMany({
      where,
      include: {
        etablissement: { select: { id: true, nom: true } },
        responsable: { select: { id: true, nom: true, prenom: true, email: true } },
        _count: { select: { services: true, catalogueKpis: true } },
      },
      orderBy: { nom: 'asc' },
    })
    const directionsWithUserCount = await Promise.all(
      directions.map(async (d) => {
        const users = await prisma.user.count({
          where: {
            OR: [{ directionId: d.id }, { service: { directionId: d.id } }],
          },
        })
        return {
          ...d,
          _count: { ...d._count, users },
        }
      })
    )
    const directeurs = await prisma.user.findMany({
      where: {
        role: 'DIRECTEUR',
        actif: true,
        directionId: { in: directionsWithUserCount.map((d) => d.id) },
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        posteOccupe: true,
        directionId: true,
      },
    })
    const directeurTitulaireParDirection = new Map<number, (typeof directeurs)[number]>()
    for (const directeur of directeurs) {
      if (
        directeur.directionId != null &&
        !estDirecteurAdjoint(directeur.posteOccupe) &&
        !directeurTitulaireParDirection.has(directeur.directionId)
      ) {
        directeurTitulaireParDirection.set(directeur.directionId, directeur)
      }
    }
    return NextResponse.json(
      directionsWithUserCount.map((d) => ({
        ...d,
        directeurTitulaire: directeurTitulaireParDirection.get(d.id) ?? null,
      })),
    )
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
  const parsed = directionCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const { etablissementId, responsableId: _responsableId, ...data } = parsed.data
  try {
    let id = etablissementId
    if (id == null) {
      const first = await prisma.etablissement.findFirst({ select: { id: true } })
      if (!first) return NextResponse.json({ error: 'Aucun établissement' }, { status: 400 })
      id = first.id
    }
    const direction = await prisma.direction.create({
      data: {
        ...data,
        etablissementId: id,
      },
      include: {
        responsable: { select: { id: true, nom: true, prenom: true, email: true } },
        _count: { select: { services: true, catalogueKpis: true } },
      },
    })
    return NextResponse.json({
      ...direction,
      _count: { ...direction._count, users: 0 },
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la création', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
