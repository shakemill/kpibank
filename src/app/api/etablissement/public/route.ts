import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * API publique : retourne le nom et logo de l'établissement (accessible sans authentification).
 * Utilisé pour afficher le nom de la banque sur la page de login et ailleurs.
 */
export async function GET() {
  try {
    const etablissement = await prisma.etablissement.findFirst({
      where: { actif: true },
      orderBy: { id: 'asc' },
      select: { nom: true, logo: true },
    })
    if (!etablissement) {
      return NextResponse.json({ nom: 'Banque Nationale', logo: null })
    }
    return NextResponse.json(etablissement)
  } catch (e) {
    return NextResponse.json(
      { nom: 'Banque Nationale', logo: null },
      { status: 200 }
    )
  }
}
