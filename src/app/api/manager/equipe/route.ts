import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireManager } from '@/lib/api-auth'
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
  const result = await getSessionAndRequireManager()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const managerId = parseInt((result.session!.user as { id?: string }).id ?? '', 10)
  if (Number.isNaN(managerId)) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
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
    const employes = await prisma.user.findMany({
      where: { managerId, role: 'EMPLOYE', actif: true },
      include: {
        service: { select: { id: true, nom: true } },
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    })

    const employesList: {
      id: number
      nom: string
      prenom: string
      email: string
      serviceId: number | null
      serviceNom: string | null
      scoreGlobal: number
      statutSaisieMois: string
      kpiTotalAssignes: number
      sommePoids: number
    }[] = []

    for (const u of employes) {
      let scoreGlobal = 0
      try {
        const r = await consolidateEmploye(u.id, periodeId, { includeSoumises: true })
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
      const kpiTotalAssignes = kpiEmployes.length
      const sommePoids = Math.round(kpiEmployes.reduce((s, k) => s + k.poids, 0) * 100) / 100

      employesList.push({
        id: u.id,
        nom: u.nom,
        prenom: u.prenom,
        email: u.email,
        serviceId: u.serviceId,
        serviceNom: u.service?.nom ?? null,
        scoreGlobal,
        statutSaisieMois,
        kpiTotalAssignes,
        sommePoids,
      })
    }

    const employesSansKpi = employesList.filter((e) => e.kpiTotalAssignes === 0)
    const saisiesManquantes = employesList.filter(
      (e) => e.statutSaisieMois === 'MANQUANTE' || e.statutSaisieMois === 'EN_RETARD'
    )

    return NextResponse.json({
      periodeId,
      periodeCode,
      employes: employesList,
      alertes: {
        employesSansKpi: employesSansKpi.map((e) => ({ id: e.id, nom: e.nom, prenom: e.prenom })),
        saisiesManquantes: saisiesManquantes.map((e) => ({
          id: e.id,
          nom: e.nom,
          prenom: e.prenom,
          statut: e.statutSaisieMois,
        })),
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
