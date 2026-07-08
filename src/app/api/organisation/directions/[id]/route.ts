import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { directionUpdateSchema } from '@/lib/validations/organisation'
import { trouverDirecteurTitulaire } from '@/lib/directeur-adjoint-utils'

const directionInclude = {
  responsable: { select: { id: true, nom: true, prenom: true, email: true } },
  _count: { select: { services: true, catalogueKpis: true } },
} as const

export async function GET(
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
    const direction = await prisma.direction.findUnique({
      where: { id },
      include: directionInclude,
    })
    if (!direction) {
      return NextResponse.json({ error: 'Direction introuvable' }, { status: 404 })
    }
    const directeurTitulaire = await trouverDirecteurTitulaire(direction.id)
    return NextResponse.json({ ...direction, directeurTitulaire })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}

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
  const parsed = directionUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  try {
    const direction = await prisma.direction.update({
      where: { id },
      data: {
        ...(parsed.data.nom != null && { nom: parsed.data.nom }),
        ...(parsed.data.code != null && { code: parsed.data.code }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.actif !== undefined && { actif: parsed.data.actif }),
      },
      include: directionInclude,
    })
    const directeurTitulaire = await trouverDirecteurTitulaire(direction.id)
    return NextResponse.json({ ...direction, directeurTitulaire })
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
    await prisma.direction.update({
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
