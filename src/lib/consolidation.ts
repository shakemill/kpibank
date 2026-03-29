import { prisma } from '@/lib/prisma'
import {
  calculerAgregation,
  calculerTauxAtteinte,
  type ModeAgregation,
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
        select: { id: true, nom: true, type: true, mode_agregation: true, unite: true },
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
    const tauxAtteinte = calculerTauxAtteinte(
      valeurAgregee,
      ke.cible,
      typeKpi
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

  const scoreGlobal = sumPoids > 0 ? sumPondsTaux / sumPoids : 0

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

  const employes = await prisma.user.findMany({
    where: { serviceId, role: 'EMPLOYE', actif: true },
    select: { id: true },
  })
  const employeIds = employes.map((e) => e.id)

  for (const eid of employeIds) {
    await consolidateEmploye(eid, periodeId)
  }

  const kpiEmployesService = await prisma.kpiEmploye.findMany({
    where: { employeId: { in: employeIds }, periodeId },
    select: { id: true, employeId: true, poids: true, kpiServiceId: true },
  })

  const scorePeriodes = await prisma.scorePeriode.findMany({
    where: {
      kpiEmployeId: { in: kpiEmployesService.map((k) => k.id) },
      periodeId,
    },
    include: {
      kpiEmploye: { select: { id: true, employeId: true, poids: true } },
    },
  })

  const employeScores = new Map<number, number>()
  for (const empId of employeIds) {
    const sps = scorePeriodes.filter((s) => s.kpiEmploye.employeId === empId)
    const totalPoids = sps.reduce((s, sp) => s + sp.kpiEmploye.poids, 0)
    const pondTaux = sps.reduce((s, sp) => s + sp.taux_atteinte * sp.kpiEmploye.poids, 0)
    const score = totalPoids > 0 ? pondTaux / totalPoids : 0
    employeScores.set(empId, score)
  }

  const nbEmployesTotal = employeIds.length
  const nbEmployesObjectifAtteint = employeIds.filter(
    (id) => (employeScores.get(id) ?? 0) >= 100
  ).length

  let tauxGlobal = 0
  if (scorePeriodes.length > 0) {
    const totalPoids = scorePeriodes.reduce((s, sp) => s + sp.kpiEmploye.poids, 0)
    const pondTaux = scorePeriodes.reduce(
      (s, sp) => s + sp.taux_atteinte * sp.kpiEmploye.poids,
      0
    )
    tauxGlobal = totalPoids > 0 ? pondTaux / totalPoids : 0
  }

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

  let tauxDirection = 0
  if (consolidations.length > 0) {
    const totalEmployes = consolidations.reduce((s, c) => s + c.nb_employes_total, 0)
    const pondTaux = consolidations.reduce(
      (s, c) => s + c.taux_atteinte_moyen * c.nb_employes_total,
      0
    )
    tauxDirection = totalEmployes > 0 ? pondTaux / totalEmployes : 0
  }

  const now = new Date()
  await prisma.consolidationDirection.deleteMany({
    where: { directionId, periodeId },
  })
  await prisma.consolidationDirection.create({
    data: {
      directionId,
      periodeId,
      taux_atteinte_moyen: tauxDirection,
      calcule_le: now,
    },
  })

  return {
    directionId,
    periodeId,
    tauxAtteinteMoyen: tauxDirection,
  }
}
