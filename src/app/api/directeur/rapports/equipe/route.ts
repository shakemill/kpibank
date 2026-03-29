import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDirecteur } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { consolidateEmploye } from '@/lib/consolidation'

async function getPeriodeIdOrDefault(periodeIdParam: string | null): Promise<number | null> {
  if (periodeIdParam) {
    const id = parseInt(periodeIdParam, 10)
    if (!Number.isNaN(id)) {
      const p = await prisma.periode.findUnique({
        where: { id },
        select: { id: true },
      })
      if (p) return p.id
    }
  }
  const periodes = await prisma.periode.findMany({
    where: { actif: true },
    orderBy: [{ annee: 'desc' }, { date_debut: 'desc' }],
    select: { id: true, statut: true },
  })
  const enCours = periodes.find((p) => p.statut === 'EN_COURS')
  return enCours?.id ?? periodes[0]?.id ?? null
}

/**
 * GET /api/directeur/rapports/equipe?periodeId=
 * Liste des personnes de la direction (employés, chefs de service, directeur) avec score période.
 */
export async function GET(request: NextRequest) {
  const result = await getSessionAndRequireDirecteur()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const directionId = result.directionId
  if (directionId == null) {
    return NextResponse.json(
      { error: "Votre compte n'est pas rattaché à une direction" },
      { status: 400 }
    )
  }

  const periodeId = await getPeriodeIdOrDefault(request.nextUrl.searchParams.get('periodeId'))
  if (periodeId == null) {
    return NextResponse.json({ error: 'Aucune période disponible' }, { status: 404 })
  }

  try {
    const periodes = await prisma.periode.findMany({
      where: { actif: true },
      orderBy: [{ annee: 'asc' }, { date_debut: 'asc' }],
      select: { id: true, code: true },
    })

    const users = await prisma.user.findMany({
      where: {
        directionId,
        actif: true,
        role: { in: ['EMPLOYE', 'CHEF_SERVICE', 'DIRECTEUR'] },
      },
      select: { id: true, nom: true, prenom: true, email: true, role: true },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    })

    const list: {
      id: number
      nom: string
      prenom: string
      email: string
      role: string
      scoreGlobal: number
    }[] = []

    for (const u of users) {
      let scoreGlobal = 0
      try {
        const r = await consolidateEmploye(u.id, periodeId, { includeSoumises: true })
        scoreGlobal = Math.round(r.scoreGlobal * 100) / 100
      } catch {
        // pas de KPI ou erreur
      }
      list.push({
        id: u.id,
        nom: u.nom,
        prenom: u.prenom,
        email: u.email,
        role: u.role,
        scoreGlobal,
      })
    }

    return NextResponse.json({
      periodeId,
      periodes,
      list,
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
