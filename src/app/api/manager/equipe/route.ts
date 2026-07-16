import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireManager } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { consolidateEmploye } from '@/lib/consolidation'
import { getCollaborateursAssignables } from '@/lib/assignation-rules'
import { agregaterStatutSaisieMois, moisRefPourPeriode } from '@/lib/saisie-utils'

function perimetreLabel(role: string): string {
  switch (role) {
    case 'DG':
      return "Tous les collaborateurs de l'organisation"
    case 'DIRECTEUR':
      return 'Collaborateurs de votre direction'
    case 'CHEF_SERVICE':
      return 'Collaborateurs de votre service'
    default:
      return 'Vos subordonnés directs'
  }
}

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
  const sessionUser = result.session!.user as {
    id?: string
    role?: string
    serviceId?: number | null
    directionId?: number | null
  }
  const managerId = parseInt(sessionUser.id ?? '', 10)
  const role = sessionUser.role ?? 'MANAGER'
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
    select: { code: true, mois_debut: true, mois_fin: true, annee: true },
  })
  const periodeCode = periode?.code ?? ''

  const now = new Date()
  const moisCalendaire = now.getMonth() + 1
  const anneeCalendaire = now.getFullYear()
  const { mois: moisRef, annee: anneeRef } = periode
    ? moisRefPourPeriode(periode, moisCalendaire, anneeCalendaire)
    : { mois: moisCalendaire, annee: anneeCalendaire }

  try {
    const collaborateurs = await getCollaborateursAssignables({
      id: managerId,
      role,
      serviceId: sessionUser.serviceId ?? null,
      directionId: sessionUser.directionId ?? null,
    })

    const employesList: {
      id: number
      nom: string
      prenom: string
      email: string
      role: string
      directionId: number | null
      directionNom: string | null
      serviceId: number | null
      serviceNom: string | null
      scoreGlobal: number
      statutSaisieMois: string
      kpiTotalAssignes: number
      sommePoids: number
    }[] = []

    for (const u of collaborateurs) {
      let scoreGlobal = 0
      try {
        const r = await consolidateEmploye(u.id, periodeId, { includeSoumises: true })
        scoreGlobal = Math.round(r.scoreGlobal * 100) / 100
      } catch {
        // skip
      }

      const kpiEmployes = await prisma.kpiEmploye.findMany({
        where: {
          employeId: u.id,
          periodeId,
          statut: { in: ['VALIDE', 'CLOTURE', 'NOTIFIE', 'ACCEPTE', 'BROUILLON', 'CONTESTE'] },
        },
        select: { id: true, poids: true, statut: true },
      })
      // KPI attendus pour la saisie : validés / clôturés (comme l’API manquantes)
      const kpiSaisissables = kpiEmployes.filter((k) => k.statut === 'VALIDE' || k.statut === 'CLOTURE')
      const kpiTotalAssignes = kpiEmployes.length
      const sommePoids = Math.round(kpiEmployes.reduce((s, k) => s + k.poids, 0) * 100) / 100

      const saisies = await prisma.saisieMensuelle.findMany({
        where: {
          employeId: u.id,
          mois: moisRef,
          annee: anneeRef,
          kpiEmployeId: { in: kpiSaisissables.map((k) => k.id) },
        },
        select: { statut: true },
      })
      const statutSaisieMois = agregaterStatutSaisieMois(saisies, kpiSaisissables.length)

      employesList.push({
        id: u.id,
        nom: u.nom,
        prenom: u.prenom,
        email: u.email,
        role: u.role,
        directionId: u.directionId,
        directionNom: u.direction?.nom ?? null,
        serviceId: u.serviceId,
        serviceNom: u.service?.nom ?? null,
        scoreGlobal,
        statutSaisieMois,
        kpiTotalAssignes,
        sommePoids,
      })
    }

    employesList.sort((a, b) => {
      const dirA = a.directionNom ?? 'Sans direction'
      const dirB = b.directionNom ?? 'Sans direction'
      if (dirA !== dirB) return dirA.localeCompare(dirB, 'fr')
      const svcA = a.serviceNom ?? 'Sans service'
      const svcB = b.serviceNom ?? 'Sans service'
      if (svcA !== svcB) return svcA.localeCompare(svcB, 'fr')
      return a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr')
    })

    const employesSansKpi = employesList.filter((e) => e.kpiTotalAssignes === 0)
    const saisiesManquantes = employesList.filter(
      (e) => e.statutSaisieMois === 'MANQUANTE' || e.statutSaisieMois === 'EN_RETARD'
    )

    return NextResponse.json({
      periodeId,
      periodeCode,
      perimetreLabel: perimetreLabel(role),
      viewerRole: role,
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
