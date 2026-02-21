import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { parametreUpdateSchema } from '@/lib/validations/organisation'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ cle: string }> }
) {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { cle } = await params
  const decodedCle = decodeURIComponent(cle)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }
  const parsed = parametreUpdateSchema.safeParse(body)
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
  const userIdNum = parseInt(userId, 10)
  if (Number.isNaN(userIdNum)) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }
  try {
    const parametre = await prisma.parametre.update({
      where: { cle: decodedCle },
      data: {
        valeur: parsed.data.valeur,
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        modifieParId: userIdNum,
        modifie_le: new Date(),
      },
      include: {
        modifiePar: { select: { id: true, nom: true, prenom: true } },
      },
    })
    return NextResponse.json(parametre)
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
