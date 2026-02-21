import { NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  try {
    const parametres = await prisma.parametre.findMany({
      include: {
        modifiePar: { select: { id: true, nom: true, prenom: true } },
      },
      orderBy: { cle: 'asc' },
    })
    return NextResponse.json(parametres)
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
