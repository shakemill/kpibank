import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { etablissementUpdateSchema } from '@/lib/validations/organisation'

export async function GET() {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  try {
    const etablissement = await prisma.etablissement.findFirst({
      orderBy: { id: 'asc' },
    })
    if (!etablissement) {
      return NextResponse.json({ error: 'Aucun établissement trouvé' }, { status: 404 })
    }
    return NextResponse.json(etablissement)
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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
  const parsed = etablissementUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  try {
    const first = await prisma.etablissement.findFirst({ select: { id: true } })
    if (!first) {
      return NextResponse.json({ error: 'Aucun établissement trouvé' }, { status: 404 })
    }
    const data: { nom?: string; logo?: string | null; actif?: boolean } = {}
    if (parsed.data.nom !== undefined) data.nom = parsed.data.nom
    if (parsed.data.logo !== undefined) data.logo = parsed.data.logo === '' ? null : parsed.data.logo
    if (parsed.data.actif !== undefined) data.actif = parsed.data.actif
    const etablissement = await prisma.etablissement.update({
      where: { id: first.id },
      data,
    })
    return NextResponse.json(etablissement)
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
