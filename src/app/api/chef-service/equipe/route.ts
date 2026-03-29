import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireChefService, getSessionAndRequireDirecteur } from '@/lib/api-auth'
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const queryServiceId = searchParams.get('serviceId')
  let serviceId: number

  const chefResult = await getSessionAndRequireChefService()
  if (!chefResult.error) {
    serviceId = chefResult.serviceId
    if (queryServiceId && parseInt(queryServiceId, 10) !== serviceId) {
      return NextResponse.json({ error: 'Accès refusé à ce service' }, { status: 403 })
    }
  } else {
    const dirResult = await getSessionAndRequireDirecteur()
    if (dirResult.error) {
      return NextResponse.json({ error: chefResult.error }, { status: chefResult.status })
    }
    const serviceIdParam = queryServiceId ? parseInt(queryServiceId, 10) : NaN
    if (Number.isNaN(serviceIdParam)) {
      return NextResponse.json(
        { error: 'Pour accéder à l’équipe d’un service, indiquez le service (ex. ?serviceId=15)' },
        { status: 400 }
      )
    }
    const service = await prisma.service.findUnique({
      where: { id: serviceIdParam },
      select: { id: true, directionId: true },
    })
    if (!service) {
      return NextResponse.json({ error: 'Service introuvable' }, { status: 404 })
    }
    if (dirResult.directionId != null && service.directionId !== dirResult.directionId) {
      return NextResponse.json({ error: 'Accès refusé à ce service' }, { status: 403 })
    }
    serviceId = service.id
  }

  const periodeId = await getPeriodeIdOrDefault(searchParams.get('periodeId'))
  if (periodeId == null) {
    return NextResponse.json({ error: 'Aucune période disponible' }, { status: 404 })
  }
  const periode = await prisma.periode.findUnique({
    where: { id: periodeId },
    select: { code: true },
  })
  const periodeCode = periode?.code ?? ''

  const now = new Date()
  const moisCourant = now.getMonth() + 1
  const anneeCourant = now.getFullYear()

  try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { direction: { select: { id: true, nom: true } } },
    })
    if (!service) {
      return NextResponse.json({ error: 'Service introuvable' }, { status: 404 })
    }

    const employes = await prisma.user.findMany({
      where: { serviceId, actif: true },
      include: {
        manager: { select: { id: true, nom: true, prenom: true } },
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    })

    const managers = employes.filter((u) => u.role === 'MANAGER')
    const managersList: {
      id: number
      nom: string
      prenom: string
      email: string
      nbCollaborateurs: number
      scoreMoyenEquipe: number
      saisiesEnAttenteValidation: number
      contestationsOuvertes: number
    }[] = []

    for (const m of managers) {
      const collaborateurs = employes.filter((u) => u.managerId === m.id)
      let scoreMoyenEquipe = 0
      if (collaborateurs.length > 0) {
        let sum = 0
        let count = 0
        for (const c of collaborateurs) {
          try {
            const r = await consolidateEmploye(c.id, periodeId)
            sum += r.scoreGlobal
            count += 1
          } catch {
            // skip
          }
        }
        scoreMoyenEquipe = count > 0 ? Math.round((sum / count) * 100) / 100 : 0
      }
      const collabIds = collaborateurs.map((c) => c.id)
      const saisiesEnAttenteValidation =
        collabIds.length === 0
          ? 0
          : await prisma.saisieMensuelle.count({
              where: {
                employeId: { in: collabIds },
                mois: moisCourant,
                annee: anneeCourant,
                statut: 'SOUMISE',
              },
            })
      const contestationsOuvertes = await prisma.kpiEmploye.count({
        where: { employeId: { in: collabIds }, statut: 'CONTESTE' },
      })

      managersList.push({
        id: m.id,
        nom: m.nom,
        prenom: m.prenom,
        email: m.email,
        nbCollaborateurs: collaborateurs.length,
        scoreMoyenEquipe,
        saisiesEnAttenteValidation,
        contestationsOuvertes,
      })
    }

    const employesList: {
      id: number
      nom: string
      prenom: string
      email: string
      role: string
      managerNom: string | null
      scoreGlobal: number
      statutSaisieMois: string
      kpiAcceptes: number
      kpiTotalAssignes: number
      sommePoids: number
    }[] = []

    for (const u of employes) {
      let scoreGlobal = 0
      try {
        const r = await consolidateEmploye(u.id, periodeId)
        scoreGlobal = Math.round(r.scoreGlobal * 100) / 100
      } catch {
        // skip
      }
      const saisie = await prisma.saisieMensuelle.findFirst({
        where: { employeId: u.id, mois: moisCourant, annee: anneeCourant },
        select: { statut: true },
      })
      let statutSaisieMois = 'MANQUANTE'
      if (saisie) {
        if (saisie.statut === 'VALIDEE' || saisie.statut === 'AJUSTEE') statutSaisieMois = 'VALIDEE'
        else if (saisie.statut === 'SOUMISE') statutSaisieMois = 'SOUMISE'
        else if (saisie.statut === 'OUVERTE' || saisie.statut === 'EN_RETARD') statutSaisieMois = 'OUVERTE'
        else statutSaisieMois = saisie.statut
      }
      const kpiEmployes = await prisma.kpiEmploye.findMany({
        where: { employeId: u.id, periodeId },
        select: { poids: true },
      })
      const kpiAssignes = kpiEmployes.length
      const sommePoids = Math.round(kpiEmployes.reduce((s, k) => s + k.poids, 0) * 100) / 100
      const kpiAcceptes = await prisma.kpiEmploye.count({
        where: { employeId: u.id, periodeId, statut: { in: ['VALIDE', 'CLOTURE'] } },
      })

      employesList.push({
        id: u.id,
        nom: u.nom,
        prenom: u.prenom,
        email: u.email,
        role: u.role,
        managerNom: u.manager ? `${u.manager.prenom} ${u.manager.nom}` : null,
        scoreGlobal,
        statutSaisieMois,
        kpiAcceptes,
        kpiTotalAssignes: kpiAssignes,
        sommePoids,
      })
    }

    const employesSansKpi = employesList.filter((e) => e.kpiTotalAssignes === 0)
    const saisiesManquantes = employesList.filter((e) => e.statutSaisieMois === 'MANQUANTE' || e.statutSaisieMois === 'EN_RETARD')

    return NextResponse.json({
      serviceId,
      serviceNom: service.nom,
      directionNom: service.direction?.nom ?? '',
      periodeId,
      periodeCode,
      managers: managersList,
      employes: employesList,
      alertes: {
        employesSansKpi: employesSansKpi.map((e) => ({ id: e.id, nom: e.nom, prenom: e.prenom })),
        saisiesManquantes: saisiesManquantes.map((e) => ({ id: e.id, nom: e.nom, prenom: e.prenom, statut: e.statutSaisieMois })),
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
