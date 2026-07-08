import { isObjectifAtteint } from '@/lib/notation-grille'
import { prisma } from '@/lib/prisma'
import {
  calculerAgregation,
  calculerTauxAtteinte,
  type ModeAgregation,
  type SensCalculKpi,
  type TypeKpi,
} from '@/lib/saisie-utils'

export type KpiDetail = {
  kpiEmployeId: number
  nom: string
  unite: string | null
  cible: number
  valeurAgregee: number
  tauxAtteinte: number
  poids: number
  contributionServicePct: number
  serviceNom: string
  directionNom?: string
  contributionDirectionPct?: number
}

export type ContributionService = {
  kpiNom: string
  serviceNom: string
  contributionPct: number
}

export type ContributionDirection = {
  kpiNom: string
  directionNom: string
  contributionPct: number
}

export type ConsolidationEmployeResult = {
  userId: number
  periodeId: number
  scoreGlobal: number
  details: KpiDetail[]
  contributionsService: ContributionService[]
  contributionsDirection: ContributionDirection[]
}

export type ConsolidationServiceResult = {
  serviceId: number
  periodeId: number
  tauxAtteinteMoyen: number
  nbEmployesTotal: number
  nbEmployesObjectifAtteint: number
}

export type ConsolidationDirectionResult = {
  directionId: number
  periodeId: number
  tauxAtteinteMoyen: number
  scoreDirectionKpis: number
  scoreEmployes: number
}

function inPeriod(
  mois: number,
  annee: number,
  moisDebut: number,
  moisFin: number,
  periodeAnnee: number
): boolean {
  if (annee !== periodeAnnee) return false
  if (moisDebut <= moisFin) return mois >= moisDebut && mois <= moisFin
  return mois >= moisDebut || mois <= moisFin
}

export type ConsolidateEmployeOptions = {
  /** Inclure les saisies SOUMISE, OUVERTE, EN_RETARD pour une vue provisoire (ex: dashboard manager) */
  includeSoumises?: boolean
}

export async function consolidateEmploye(
  userId: number,
  periodeId: number,
  options?: ConsolidateEmployeOptions
): Promise<ConsolidationEmployeResult> {
  const periode = await prisma.periode.findUnique({
    where: { id: periodeId },
    select: { id: true, mois_debut: true, mois_fin: true, annee: true },
  })
  if (!periode) {
    throw new Error('Période introuvable')
  }

  const kpiEmployes = await prisma.kpiEmploye.findMany({
    where: {
      employeId: userId,
      periodeId,
      statut: { in: ['VALIDE', 'CLOTURE'] },
    },
    include: {
      catalogueKpi: {
        select: {
          id: true,
          nom: true,
          type: true,
          mode_agregation: true,
          unite: true,
          sens_calcul: true,
        },
      },
      kpiService: {
        select: {
          id: true,
          cible: true,
          poids_dans_direction: true,
          service: { select: { id: true, nom: true, directionId: true } },
          kpiDirection: {
            select: {
              direction: { select: { id: true, nom: true } },
            },
          },
        },
      },
    },
    orderBy: { id: 'asc' },
  })

  const details: KpiDetail[] = []
  const contributionsService: ContributionService[] = []
  const contributionsDirection: ContributionDirection[] = []
  const scorePeriodesToCreate: { kpiEmployeId: number; valeur_agregee: number; taux_atteinte: number }[] = []
  let sumPondsTaux = 0
  let sumPoids = 0
  const now = new Date()

  // Une seule requête pour toutes les saisies des KPI employé (évite N+1)
  const kpiEmployeIds = kpiEmployes.map((k) => k.id)
  const allSaisies = await prisma.saisieMensuelle.findMany({
    where: {
      kpiEmployeId: { in: kpiEmployeIds },
      statut: { in: ['VALIDEE', 'AJUSTEE'] },
    },
    select: { kpiEmployeId: true, mois: true, annee: true, valeur_realisee: true, valeur_ajustee: true },
  })
  const saisiesByKpiEmploye = new Map<number, typeof allSaisies>()
  for (const s of allSaisies) {
    const list = saisiesByKpiEmploye.get(s.kpiEmployeId) ?? []
    list.push(s)
    saisiesByKpiEmploye.set(s.kpiEmployeId, list)
  }

  for (const ke of kpiEmployes) {
    const saisies = saisiesByKpiEmploye.get(ke.id) ?? []

    const inPeriodSaisies = saisies.filter((s) =>
      inPeriod(
        s.mois,
        s.annee,
        periode.mois_debut,
        periode.mois_fin,
        periode.annee
      )
    )

    const forAgregation = inPeriodSaisies.map((s) => ({
      mois: s.mois,
      annee: s.annee,
      valeur_realisee: s.valeur_ajustee ?? s.valeur_realisee,
    }))

    const valeurAgregee = calculerAgregation(
      forAgregation,
      (ke.catalogueKpi.mode_agregation ?? 'MOYENNE') as ModeAgregation
    )
    const typeKpi = (ke.catalogueKpi.type ?? 'QUANTITATIF') as TypeKpi
    const sensCalcul = (ke.catalogueKpi.sens_calcul ?? 'DIRECT') as SensCalculKpi
    const tauxAtteinte = calculerTauxAtteinte(
      valeurAgregee,
      ke.cible,
      typeKpi,
      sensCalcul
    )

    const cibleService = ke.kpiService?.cible ?? ke.cible
    const contributionServicePct =
      cibleService > 0 ? Math.min(150, (valeurAgregee / cibleService) * 100) : 0
    const poidsDir = ke.kpiService?.poids_dans_direction ?? 0
    const serviceNom = ke.kpiService?.service?.nom ?? '—'
    details.push({
      kpiEmployeId: ke.id,
      nom: ke.catalogueKpi.nom,
      unite: ke.catalogueKpi.unite ?? null,
      cible: ke.cible,
      valeurAgregee,
      tauxAtteinte,
      poids: ke.poids,
      contributionServicePct: Math.min(100, contributionServicePct * (poidsDir / 100)),
      serviceNom,
      directionNom: ke.kpiService?.kpiDirection?.direction?.nom,
      contributionDirectionPct: ke.kpiService?.kpiDirection
        ? Math.min(100, contributionServicePct * (poidsDir / 100))
        : undefined,
    })

    contributionsService.push({
      kpiNom: ke.catalogueKpi.nom,
      serviceNom,
      contributionPct: Math.min(100, contributionServicePct * (poidsDir / 100)),
    })
    if (ke.kpiService?.kpiDirection?.direction) {
      contributionsDirection.push({
        kpiNom: ke.catalogueKpi.nom,
        directionNom: ke.kpiService.kpiDirection.direction.nom,
        contributionPct: Math.min(100, contributionServicePct * (poidsDir / 100)),
      })
    }

    sumPondsTaux += tauxAtteinte * ke.poids
    sumPoids += ke.poids
    scorePeriodesToCreate.push({
      kpiEmployeId: ke.id,
      valeur_agregee: valeurAgregee,
      taux_atteinte: tauxAtteinte,
    })
  }

  const scoreGlobal =
    sumPoids > 0
      ? sumPondsTaux / sumPoids
      : kpiEmployes.length > 0
        ? details.reduce((s, d) => s + d.tauxAtteinte, 0) / kpiEmployes.length
        : 0

  const skipScorePeriode = options?.includeSoumises
  if (kpiEmployeIds.length > 0 && !skipScorePeriode) {
    await prisma.scorePeriode.deleteMany({
      where: { kpiEmployeId: { in: kpiEmployeIds }, periodeId },
    })
    await prisma.scorePeriode.createMany({
      data: scorePeriodesToCreate.map((s) => ({
        kpiEmployeId: s.kpiEmployeId,
        periodeId,
        valeur_agregee: s.valeur_agregee,
        taux_atteinte: s.taux_atteinte,
        calcule_le: now,
      })),
    })
  }

  return {
    userId,
    periodeId,
    scoreGlobal,
    details,
    contributionsService,
    contributionsDirection,
  }
}

export async function consolidateService(
  serviceId: number,
  periodeId: number
): Promise<ConsolidationServiceResult> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true },
  })
  if (!service) throw new Error('Service introuvable')

  const membres = await prisma.user.findMany({
    where: { serviceId, actif: true },
    select: { id: true },
  })
  const membreIds = membres.map((m) => m.id)

  const employeScores = new Map<number, number>()
  for (const mid of membreIds) {
    const result = await consolidateEmploye(mid, periodeId)
    employeScores.set(mid, result.scoreGlobal)
  }

  const scores = membreIds.map((id) => employeScores.get(id) ?? 0)
  const tauxGlobal =
    scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0

  const nbEmployesTotal = membreIds.length
  const nbEmployesObjectifAtteint = scores.filter((s) => isObjectifAtteint(s)).length

  const now = new Date()
  await prisma.consolidationService.deleteMany({
    where: { serviceId, periodeId },
  })
  await prisma.consolidationService.create({
    data: {
      serviceId,
      periodeId,
      taux_atteinte_moyen: tauxGlobal,
      nb_employes_total: nbEmployesTotal,
      nb_employes_objectif_atteint: nbEmployesObjectifAtteint,
      calcule_le: now,
    },
  })

  return {
    serviceId,
    periodeId,
    tauxAtteinteMoyen: tauxGlobal,
    nbEmployesTotal,
    nbEmployesObjectifAtteint,
  }
}


async function consolidateDirectionKpis(
  directionId: number,
  periodeId: number
): Promise<number> {
  const periode = await prisma.periode.findUnique({
    where: { id: periodeId },
    select: { mois_debut: true, mois_fin: true, annee: true },
  })
  if (!periode) return 0

  const kpiDirections = await prisma.kpiDirection.findMany({
    where: { directionId, periodeId, statut: 'ACTIF' },
    include: {
      catalogueKpi: {
        select: { type: true, sens_calcul: true, mode_agregation: true },
      },
    },
  })
  if (kpiDirections.length === 0) return 0

  const kpiIds = kpiDirections.map((k) => k.id)
  const saisies = await prisma.saisieDirection.findMany({
    where: {
      kpiDirectionId: { in: kpiIds },
      annee: periode.annee,
      mois: { gte: periode.mois_debut, lte: periode.mois_fin },
      statut: { in: ['VALIDEE', 'AJUSTEE'] },
    },
    select: {
      kpiDirectionId: true,
      mois: true,
      annee: true,
      valeur_realisee: true,
      valeur_ajustee: true,
    },
  })

  const now = new Date()
  await prisma.scorePeriodeDirection.deleteMany({
    where: { kpiDirectionId: { in: kpiIds }, periodeId },
  })

  let sumPond = 0
  let sumPoids = 0

  for (const kd of kpiDirections) {
    const mode = (kd.catalogueKpi.mode_agregation ?? 'MOYENNE') as ModeAgregation
    const typeKpi = kd.catalogueKpi.type as TypeKpi
    const sensCalcul = (kd.catalogueKpi.sens_calcul ?? 'DIRECT') as SensCalculKpi
    const saisiesKpi = saisies
      .filter((s) => s.kpiDirectionId === kd.id)
      .map((s) => ({
        mois: s.mois,
        annee: s.annee,
        valeur_realisee: s.valeur_ajustee ?? s.valeur_realisee,
      }))

    if (saisiesKpi.length === 0) continue

    const valeurAgregee = calculerAgregation(saisiesKpi, mode)
    const tauxAtteinte = calculerTauxAtteinte(
      valeurAgregee,
      kd.cible,
      typeKpi,
      sensCalcul
    )

    await prisma.scorePeriodeDirection.create({
      data: {
        kpiDirectionId: kd.id,
        periodeId,
        valeur_agregee: valeurAgregee,
        taux_atteinte: tauxAtteinte,
        calcule_le: now,
      },
    })

    sumPond += tauxAtteinte * kd.poids
    sumPoids += kd.poids
  }

  return sumPoids > 0 ? sumPond / sumPoids : 0
}

export async function consolidateDirection(
  directionId: number,
  periodeId: number
): Promise<ConsolidationDirectionResult> {
  const direction = await prisma.direction.findUnique({
    where: { id: directionId },
    select: { id: true },
  })
  if (!direction) throw new Error('Direction introuvable')

  const services = await prisma.service.findMany({
    where: { directionId },
    select: { id: true },
  })

  for (const svc of services) {
    await consolidateService(svc.id, periodeId)
  }

  const consolidations = await prisma.consolidationService.findMany({
    where: {
      serviceId: { in: services.map((s) => s.id) },
      periodeId,
    },
    select: { taux_atteinte_moyen: true, nb_employes_total: true },
  })

  let scoreEmployes = 0
  if (consolidations.length > 0) {
    scoreEmployes =
      consolidations.reduce((s, c) => s + c.taux_atteinte_moyen, 0) / consolidations.length
  }

  const scoreDirectionKpis = await consolidateDirectionKpis(directionId, periodeId)

  const now = new Date()
  await prisma.consolidationDirection.deleteMany({
    where: { directionId, periodeId },
  })
  await prisma.consolidationDirection.create({
    data: {
      directionId,
      periodeId,
      taux_atteinte_moyen: scoreEmployes,
      score_direction_kpis: scoreDirectionKpis,
      score_employes: scoreEmployes,
      calcule_le: now,
    },
  })

  return {
    directionId,
    periodeId,
    tauxAtteinteMoyen: scoreEmployes,
    scoreDirectionKpis,
    scoreEmployes,
  }
}
