/**
 * Script additif : ajoute les données pour tester la saisie "en cours" (février 2026).
 * À lancer sur une base déjà seedée : pnpm tsx prisma/seed-2026.ts
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const MOIS_FEVRIER = 2
const ANNEE_2026 = 2026

async function main() {
  const existingS1_2026 = await prisma.periode.findFirst({ where: { code: 'S1-2026' } })

  const userDG = await prisma.user.findFirst({ where: { email: 'youssef.benali@bgfi.com' } })
  const userDirCom = await prisma.user.findFirst({ where: { email: 'dir.commercial@bgfi.com' } })
  const chefPme = await prisma.user.findFirst({ where: { email: 'chef.pme@bgfi.com' } })
  const managerPme = await prisma.user.findFirst({ where: { email: 'manager.pme@bgfi.com' } })
  const mehdi = await prisma.user.findFirst({ where: { email: 'mehdi.ouali@bgfi.com' } })
  if (!userDG?.id || !userDirCom?.id || !chefPme?.id || !managerPme?.id || !mehdi?.id) {
    throw new Error('Utilisateurs seed introuvables. Exécutez d\'abord le seed principal (après migrate reset).')
  }

  const dirCom = await prisma.direction.findFirst({ where: { code: 'DIR_COM' } })
  const srvPme = await prisma.service.findFirst({ where: { code: 'SRV_PME' } })
  if (!dirCom?.id || !srvPme?.id) {
    throw new Error('Direction ou service PME introuvable.')
  }

  const catVolume = await prisma.catalogueKpi.findFirst({ where: { nom: 'Volume crédits accordés' } })
  const catDossiers = await prisma.catalogueKpi.findFirst({ where: { nom: 'Nombre de dossiers traités' } })
  const catSatisfaction = await prisma.catalogueKpi.findFirst({ where: { nom: 'Satisfaction client' } })
  const catCrm = await prisma.catalogueKpi.findFirst({ where: { nom: 'Maîtrise des outils CRM' } })
  if (!catVolume?.id || !catDossiers?.id || !catSatisfaction?.id || !catCrm?.id) {
    throw new Error('Catalogue KPI introuvable.')
  }

  let s1_2026 = existingS1_2026

  if (!existingS1_2026) {
    s1_2026 = await prisma.periode.create({
    data: {
      type: 'SEMESTRIEL',
      code: 'S1-2026',
      mois_debut: 1,
      mois_fin: 6,
      annee: 2026,
      date_debut: new Date('2026-01-01'),
      date_fin: new Date('2026-06-30'),
      date_limite_saisie: new Date('2026-07-10'),
      statut: 'EN_COURS',
      actif: true,
    },
  })
    await prisma.periode.create({
      data: {
        type: 'TRIMESTRIEL',
        code: 'T1-2026',
        mois_debut: 1,
        mois_fin: 3,
        annee: 2026,
        date_debut: new Date('2026-01-01'),
        date_fin: new Date('2026-03-31'),
        date_limite_saisie: new Date('2026-04-10'),
        statut: 'EN_COURS',
        actif: true,
      },
    })
  }

  if (existingS1_2026) {
    const kpiEmployesFeb = await prisma.kpiEmploye.findMany({
      where: { employeId: mehdi!.id, periodeId: s1_2026!.id },
      select: { id: true },
    })
    const existingSaisies = await prisma.saisieMensuelle.findMany({
      where: { employeId: mehdi!.id, mois: MOIS_FEVRIER, annee: ANNEE_2026 },
      select: { kpiEmployeId: true },
    })
    const existingIds = new Set(existingSaisies.map((s) => s.kpiEmployeId))
    for (const ke of kpiEmployesFeb) {
      if (existingIds.has(ke.id)) continue
      await prisma.saisieMensuelle.create({
        data: {
          kpiEmployeId: ke.id,
          employeId: mehdi!.id,
          mois: MOIS_FEVRIER,
          annee: ANNEE_2026,
          statut: 'OUVERTE',
        },
      })
    }
    console.log('Saisies Février 2026 (Mehdi) ajoutées ou déjà présentes.')
    return
  }

  const kpiDirVolume2026 = await prisma.kpiDirection.create({
    data: {
      catalogueKpiId: catVolume.id,
      directionId: dirCom.id,
      periodeId: s1_2026.id,
      cible: 520,
      poids: 40,
      statut: 'ACTIF',
      creeParId: userDirCom.id,
    },
  })
  const kpiDirSatisfaction2026 = await prisma.kpiDirection.create({
    data: {
      catalogueKpiId: catSatisfaction.id,
      directionId: dirCom.id,
      periodeId: s1_2026.id,
      cible: 4.2,
      poids: 25,
      statut: 'ACTIF',
      creeParId: userDirCom.id,
    },
  })

  const kpiSrvVolume2026 = await prisma.kpiService.create({
    data: {
      catalogueKpiId: catVolume.id,
      serviceId: srvPme.id,
      periodeId: s1_2026.id,
      kpiDirectionId: kpiDirVolume2026.id,
      poids_dans_direction: 40,
      cible: 210,
      poids: 35,
      statut: 'ACTIF',
      creeParId: chefPme.id,
    },
  })
  const kpiSrvDossiers2026 = await prisma.kpiService.create({
    data: {
      catalogueKpiId: catDossiers.id,
      serviceId: srvPme.id,
      periodeId: s1_2026.id,
      kpiDirectionId: kpiDirVolume2026.id,
      poids_dans_direction: 60,
      cible: 18,
      poids: 40,
      statut: 'ACTIF',
      creeParId: chefPme.id,
    },
  })
  const kpiSrvSatisfaction2026 = await prisma.kpiService.create({
    data: {
      catalogueKpiId: catSatisfaction.id,
      serviceId: srvPme.id,
      periodeId: s1_2026.id,
      kpiDirectionId: kpiDirSatisfaction2026.id,
      poids_dans_direction: 50,
      cible: 4.0,
      poids: 25,
      statut: 'ACTIF',
      creeParId: chefPme.id,
    },
  })

  const kpiEmpDossiers2026 = await prisma.kpiEmploye.create({
    data: {
      catalogueKpiId: catDossiers.id,
      employeId: mehdi.id,
      assigneParId: managerPme.id,
      kpiServiceId: kpiSrvDossiers2026.id,
      periodeId: s1_2026.id,
      cible: 15,
      poids: 40,
      statut: 'VALIDE',
      date_notification: new Date('2026-01-05'),
      date_acceptation: new Date('2026-01-06'),
    },
  })
  const kpiEmpSatisfaction2026 = await prisma.kpiEmploye.create({
    data: {
      catalogueKpiId: catSatisfaction.id,
      employeId: mehdi.id,
      assigneParId: managerPme.id,
      kpiServiceId: kpiSrvSatisfaction2026.id,
      periodeId: s1_2026.id,
      cible: 4.0,
      poids: 35,
      statut: 'VALIDE',
      date_notification: new Date('2026-01-05'),
      date_acceptation: new Date('2026-01-06'),
    },
  })
  const kpiEmpCrm2026 = await prisma.kpiEmploye.create({
    data: {
      catalogueKpiId: catCrm.id,
      employeId: mehdi.id,
      assigneParId: managerPme.id,
      kpiServiceId: kpiSrvVolume2026.id,
      periodeId: s1_2026.id,
      cible: 3,
      poids: 25,
      statut: 'VALIDE',
      date_notification: new Date('2026-01-05'),
      date_acceptation: new Date('2026-01-06'),
    },
  })

  await prisma.saisieMensuelle.createMany({
    data: [
      { kpiEmployeId: kpiEmpDossiers2026.id, employeId: mehdi.id, mois: MOIS_FEVRIER, annee: ANNEE_2026, statut: 'OUVERTE' },
      { kpiEmployeId: kpiEmpSatisfaction2026.id, employeId: mehdi.id, mois: MOIS_FEVRIER, annee: ANNEE_2026, statut: 'OUVERTE' },
      { kpiEmployeId: kpiEmpCrm2026.id, employeId: mehdi.id, mois: MOIS_FEVRIER, annee: ANNEE_2026, statut: 'OUVERTE' },
    ],
  })

  console.log('Données 2026 (S1-2026, KPI Mehdi + saisies Février) ajoutées.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
