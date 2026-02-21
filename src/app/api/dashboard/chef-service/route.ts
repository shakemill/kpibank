import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireChefService } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { consolidateEmploye, consolidateService } from '@/lib/consolidation'

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
  const result = await getSessionAndRequireChefService()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const userId = parseInt((result.session!.user as { id?: string }).id ?? '', 10)
  const serviceId = result.serviceId
  const { searchParams } = new URL(request.url)
  const periodeId = await getPeriodeIdOrDefault(searchParams.get('periodeId'))
  if (periodeId == null) {
    return NextResponse.json({ error: 'Aucune période disponible' }, { status: 404 })
  }

  try {
    const now = new Date()
    const moisCourant = now.getMonth() + 1
    const anneeCourant = now.getFullYear()

    // Service + direction
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { direction: { select: { id: true, nom: true } } },
    })
    if (!service) {
      return NextResponse.json({ error: 'Service introuvable' }, { status: 404 })
    }

    const periode = await prisma.periode.findUnique({
      where: { id: periodeId },
      select: { id: true, code: true, statut: true },
    })
    if (!periode) {
      return NextResponse.json({ error: 'Période introuvable' }, { status: 404 })
    }

    // 1. KPI personnels du chef (assignés par son Directeur)
    let kpiPersonnels: { scoreGlobal: number; details: { nom: string; cible: number; valeurAgregee: number; tauxAtteinte: number; poids: number }[] } = {
      scoreGlobal: 0,
      details: [],
    }
    try {
      const perso = await consolidateEmploye(userId, periodeId)
      kpiPersonnels = {
        scoreGlobal: perso.scoreGlobal,
        details: perso.details.map((d) => ({
          nom: d.nom,
          cible: d.cible,
          valeurAgregee: d.valeurAgregee,
          tauxAtteinte: d.tauxAtteinte,
          poids: d.poids,
        })),
      }
    } catch {
      // Pas de KPI perso ou erreur consolidation
    }

    // 2. Score service (consolidation)
    await consolidateService(serviceId, periodeId)
    const consService = await prisma.consolidationService.findFirst({
      where: { serviceId, periodeId },
      select: { taux_atteinte_moyen: true },
    })
    const scoreService = consService?.taux_atteinte_moyen ?? 0

    // Période précédente pour comparaison
    const periodes = await prisma.periode.findMany({
      where: { actif: true },
      orderBy: [{ annee: 'desc' }, { date_debut: 'desc' }],
      select: { id: true },
      take: 2,
    })
    const prevPeriodeId = periodes.find((p) => p.id !== periodeId)?.id
    let scoreServicePrecedent: number | null = null
    if (prevPeriodeId) {
      await consolidateService(serviceId, prevPeriodeId)
      const prevCons = await prisma.consolidationService.findFirst({
        where: { serviceId, periodeId: prevPeriodeId },
        select: { taux_atteinte_moyen: true },
      })
      scoreServicePrecedent = prevCons?.taux_atteinte_moyen ?? null
    }
    const comparaisonVsPrecedent =
      scoreServicePrecedent != null ? scoreService - scoreServicePrecedent : null

    // 3. KPI Service (liste avec réalisé agrégé, taux)
    const kpiServicesRows = await prisma.kpiService.findMany({
      where: { serviceId, periodeId, statut: 'ACTIF' },
      include: {
        catalogueKpi: { select: { nom: true, unite: true } },
        kpiDirection: { select: { id: true, direction: { select: { nom: true } } } },
        kpiEmployes: {
          where: { statut: { in: ['VALIDE', 'CLOTURE'] } },
          include: {
            scorePeriodes: { where: { periodeId }, select: { valeur_agregee: true, taux_atteinte: true } },
          },
        },
      },
    })
    const kpiService = kpiServicesRows.map((ks) => {
      let valeurAgregee = 0
      let tauxPondere = 0
      let totalPoids = 0
      for (const ke of ks.kpiEmployes) {
        const sp = ke.scorePeriodes[0]
        if (sp) {
          valeurAgregee += sp.valeur_agregee * ke.poids
          tauxPondere += sp.taux_atteinte * ke.poids
          totalPoids += ke.poids
        }
      }
      const taux = totalPoids > 0 ? tauxPondere / totalPoids : 0
      const realises = totalPoids > 0 ? valeurAgregee / totalPoids : 0
      return {
        id: ks.id,
        nom: ks.catalogueKpi.nom,
        unite: ks.catalogueKpi.unite,
        cible: ks.cible,
        realise: realises,
        taux,
      }
    })

    // 4. Équipe (managers + employés du service)
    const equipeUsers = await prisma.user.findMany({
      where: { serviceId, role: { in: ['MANAGER', 'EMPLOYE'] }, actif: true },
      select: { id: true, nom: true, prenom: true, role: true },
    })
    const equipe: {
      id: number
      nom: string
      prenom: string
      role: string
      score: number
      saisieMoisCourant: 'Soumise' | 'Validée' | 'Non soumise' | 'N/A'
      statut: string
    }[] = []
    for (const u of equipeUsers) {
      let score = 0
      try {
        const r = await consolidateEmploye(u.id, periodeId)
        score = r.scoreGlobal
      } catch {
        // pas de KPI ou erreur
      }
      const saisie = await prisma.saisieMensuelle.findFirst({
        where: { employeId: u.id, mois: moisCourant, annee: anneeCourant },
        select: { statut: true },
      })
      let saisieMoisCourant: 'Soumise' | 'Validée' | 'Non soumise' | 'N/A' = 'N/A'
      if (saisie) {
        if (saisie.statut === 'VALIDEE' || saisie.statut === 'AJUSTEE') saisieMoisCourant = 'Validée'
        else if (saisie.statut === 'SOUMISE') saisieMoisCourant = 'Soumise'
        else saisieMoisCourant = 'Non soumise'
      } else {
        saisieMoisCourant = 'Non soumise'
      }
      equipe.push({
        id: u.id,
        nom: u.nom,
        prenom: u.prenom,
        role: u.role,
        score,
        saisieMoisCourant,
        statut: saisieMoisCourant === 'Validée' ? 'Validée' : saisieMoisCourant === 'Soumise' ? 'En attente' : saisieMoisCourant === 'Non soumise' ? 'Non saisie' : 'N/A',
      })
    }

    // 5. Actions requises
    const employeIds = equipeUsers.map((u) => u.id)
    const nbSaisiesEnAttente = await prisma.saisieMensuelle.count({
      where: {
        employeId: { in: employeIds },
        mois: moisCourant,
        annee: anneeCourant,
        statut: 'SOUMISE',
      },
    })
    const poidsByDir = new Map<number, number>()
    for (const ks of kpiServicesRows) {
      if (ks.kpiDirectionId == null) continue
      const cur = poidsByDir.get(ks.kpiDirectionId) ?? 0
      poidsByDir.set(ks.kpiDirectionId, cur + (ks.poids_dans_direction ?? 0))
    }
    const kpiServicePoidsIncomplets = Array.from(poidsByDir.values()).filter((v) => Math.abs(v - 100) > 0.01).length
    const nbContestations = await prisma.kpiEmploye.count({
      where: { employeId: { in: employeIds }, statut: 'CONTESTE' },
    })

    const actionsRequises = {
      nbSaisiesEnAttenteValidation: nbSaisiesEnAttente,
      nbKpiServicePoidsIncomplet: kpiServicePoidsIncomplets,
      nbContestationsEnCours: nbContestations,
    }

    // 6. Contribution à la direction (KpiService → KpiDirection, poids_dans_direction)
    const contributionDirection: { kpiNom: string; directionNom: string; contributionPct: number }[] = []
    for (const ks of kpiServicesRows) {
      if (!ks.kpiDirection || !ks.kpiDirection.direction) continue
      const pct = ks.poids_dans_direction ?? 0
      contributionDirection.push({
        kpiNom: ks.catalogueKpi.nom,
        directionNom: ks.kpiDirection.direction.nom,
        contributionPct: pct,
      })
    }

    // Saisie du mois non soumise pour le chef (bandeau)
    const chefKpis = await prisma.kpiEmploye.findMany({
      where: { employeId: userId, periodeId, statut: { in: ['VALIDE', 'CLOTURE'] } },
      select: { id: true },
    })
    let saisieMoisNonSoumiseChef = false
    if (chefKpis.length > 0) {
      const saisieChef = await prisma.saisieMensuelle.findFirst({
        where: {
          employeId: userId,
          mois: moisCourant,
          annee: anneeCourant,
          statut: { in: ['SOUMISE', 'VALIDEE', 'AJUSTEE'] },
        },
      })
      saisieMoisNonSoumiseChef = !saisieChef
    }

    return NextResponse.json({
      serviceNom: service.nom,
      directionNom: service.direction?.nom ?? '',
      periodeId,
      periodeCode: periode.code,
      kpiPersonnels,
      scoreService,
      comparaisonVsPrecedent,
      kpiService,
      equipe,
      actionsRequises,
      contributionDirection,
      saisieMoisNonSoumiseChef,
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur dashboard chef-service', details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
