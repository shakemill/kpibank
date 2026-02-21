import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDirecteur } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { consolidateService } from '@/lib/consolidation'

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

export async function GET(request: NextRequest) {
  const result = await getSessionAndRequireDirecteur()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { searchParams } = new URL(request.url)
  const queryDirectionId = searchParams.get('directionId')
  const role = (result.session!.user as { role?: string }).role
  const isDG = role === 'DG'

  let directionId: number | null = null
  if (isDG) {
    if (queryDirectionId) {
      const id = parseInt(queryDirectionId, 10)
      if (!Number.isNaN(id)) directionId = id
    }
    if (directionId == null) {
      return NextResponse.json(
        { error: 'directionId requis pour la vue DG (query param)' },
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
    if (queryDirectionId && parseInt(queryDirectionId, 10) !== directionId) {
      return NextResponse.json({ error: 'Accès refusé à cette direction' }, { status: 403 })
    }
  }

  const periodeId = await getPeriodeIdOrDefault(searchParams.get('periodeId'))
  if (periodeId == null) {
    return NextResponse.json({ error: 'Aucune période disponible' }, { status: 404 })
  }

  const now = new Date()
  const moisCourant = now.getMonth() + 1
  const anneeCourant = now.getFullYear()

  try {
    const services = await prisma.service.findMany({
      where: { directionId },
      include: {
        responsable: { select: { id: true, nom: true, prenom: true, email: true } },
        _count: { select: { employes: true } },
      },
      orderBy: { nom: 'asc' },
    })

    const direction = await prisma.direction.findUnique({
      where: { id: directionId },
      select: { id: true, nom: true, code: true },
    })

    const list: {
      id: number
      nom: string
      code: string
      responsable: { id: number; nom: string; prenom: string; email: string } | null
      nbEmployes: number
      kpiActifs: number
      tauxAtteinte: number
      nbSaisiesEnRetard: number
      actif: boolean
    }[] = []

    for (const svc of services) {
      await consolidateService(svc.id, periodeId)
      const cons = await prisma.consolidationService.findFirst({
        where: { serviceId: svc.id, periodeId },
        select: { taux_atteinte_moyen: true },
      })
      const tauxAtteinte = cons?.taux_atteinte_moyen ?? 0

      const kpiActifs = await prisma.kpiService.count({
        where: { serviceId: svc.id, periodeId, statut: 'ACTIF' },
      })

      const employeIds = await prisma.user.findMany({
        where: { serviceId: svc.id, actif: true },
        select: { id: true },
      }).then((u) => u.map((x) => x.id))

      const nbSaisiesEnRetard =
        employeIds.length === 0
          ? 0
          : await prisma.saisieMensuelle.count({
              where: {
                employeId: { in: employeIds },
                mois: moisCourant,
                annee: anneeCourant,
                en_retard: true,
                statut: { not: 'VALIDEE' },
              },
            })

      list.push({
        id: svc.id,
        nom: svc.nom,
        code: svc.code,
        responsable: svc.responsable,
        nbEmployes: svc._count.employes,
        kpiActifs,
        tauxAtteinte: Math.round(tauxAtteinte * 100) / 100,
        nbSaisiesEnRetard,
        actif: svc.actif,
      })
    }

    return NextResponse.json({
      directionId,
      directionNom: direction?.nom ?? '',
      directionCode: direction?.code ?? '',
      periodeId,
      services: list,
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
