/**
 * Ajoute les KPI DSI (Infra & Dev) sur S1-2026 pour les employés DSI.
 * À lancer si "Aucun KPI assigné" pour khalid.bennani, amine.zouari, etc.
 * pnpm exec tsx prisma/scripts/add-kpi-dsi-s1-2026.ts
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const perS1_2026 = await prisma.periode.findFirst({ where: { code: 'S1-2026' } })
  if (!perS1_2026) throw new Error('S1-2026 introuvable. Lancez add-periodes-2026 avant.')

  const dirDsi = await prisma.direction.findFirst({ where: { code: 'DIR_DSI' } })
  if (!dirDsi) {
    console.log('Direction DSI absente. Lancez seed:dsi avant.')
    return
  }

  const srvInfra = await prisma.service.findFirst({ where: { code: 'SRV_INFRA' } })
  const srvDev = await prisma.service.findFirst({ where: { code: 'SRV_DEV' } })
  if (!srvInfra || !srvDev) {
    console.log('Services SRV_INFRA ou SRV_DEV absents.')
    return
  }

  const usrDg = await prisma.user.findFirst({ where: { role: 'DG' } })
  const usrDirDsi = await prisma.user.findFirst({ where: { email: 'dir.dsi@banque.ma' } })
  const usrCsInfra = await prisma.user.findFirst({ where: { email: 'chef.infra@banque.ma' } })
  const usrCsDev = await prisma.user.findFirst({ where: { email: 'chef.dev@banque.ma' } })
  const usrMgrInfra = await prisma.user.findFirst({ where: { email: 'manager.infra@banque.ma' } })
  const usrMgrDev = await prisma.user.findFirst({ where: { email: 'manager.dev@banque.ma' } })
  if (!usrDg || !usrDirDsi || !usrCsInfra || !usrCsDev || !usrMgrInfra || !usrMgrDev) {
    console.log('Utilisateurs DSI introuvables (dir.dsi@banque.ma, chef.infra, etc.).')
    return
  }

  const getCat = (nom: string) => prisma.catalogueKpi.findFirst({ where: { nom } })
  const cat17 = await getCat('Disponibilité systèmes')
  const cat18 = await getCat('Délai résolution incidents')
  const cat19 = await getCat('Livraison projets dans les délais')
  const cat20 = await getCat('Satisfaction utilisateurs internes')
  const cat21 = await getCat('Taux sauvegardes réussies')
  const cat22 = await getCat('Taux bugs post-livraison')
  const cat23 = await getCat('Vélocité équipe (story points)')
  const cat24 = await getCat('Couverture tests unitaires')
  const cat25 = await getCat('Score accessibilité Lighthouse')
  const cat26 = await getCat('Tickets N1 traités')
  const cat27 = await getCat('Jalons projets livrés')
  const cat28 = await getCat('Risques identifiés et mitigés')
  const cat29 = await getCat('Maîtrise outils supervision')
  const cat30 = await getCat('Qualité du code')
  const cat31 = await getCat('Maîtrise Next.js/TypeScript')
  const cat12 = await getCat('Qualité des rapports')
  const cat14 = await getCat('Gestion du risque')
  const cat15 = await getCat('Leadership et communication')
  const cat6 = await getCat('Taux de réalisation budgétaire')

  const required = [cat17, cat18, cat19, cat20, cat21, cat22, cat23, cat24, cat25, cat26, cat27, cat28, cat29, cat30, cat31, cat12, cat14, cat15, cat6]
  if (required.some((c) => !c)) {
    console.log('Catalogues KPI DSI manquants. Lancez le seed principal avec les données DSI.')
    return
  }

  const upsertKpiDir = async (opts: { catalogueId: number; cible: number; poids: number }) => {
    const ex = await prisma.kpiDirection.findFirst({
      where: { directionId: dirDsi.id, periodeId: perS1_2026.id, catalogueKpiId: opts.catalogueId },
    })
    if (ex) return ex
    return prisma.kpiDirection.create({
      data: {
        catalogueKpiId: opts.catalogueId,
        directionId: dirDsi.id,
        periodeId: perS1_2026.id,
        cible: opts.cible,
        poids: opts.poids,
        statut: 'ACTIF',
        creeParId: usrDirDsi.id,
      },
    })
  }
  const kpiDir1 = await upsertKpiDir({ catalogueId: cat17!.id, cible: 99.5, poids: 35 })
  const kpiDir2 = await upsertKpiDir({ catalogueId: cat18!.id, cible: 4, poids: 30 })
  const kpiDir3 = await upsertKpiDir({ catalogueId: cat19!.id, cible: 80, poids: 25 })
  const kpiDir4 = await upsertKpiDir({ catalogueId: cat20!.id, cible: 4.0, poids: 10 })

  const upsertKpiSrv = async (opts: {
    catalogueId: number
    serviceId: number
    kpiDirId: number | null
    poidsDir: number | null
    cible: number
    poids: number
    creeParId: number
  }) => {
    const ex = await prisma.kpiService.findFirst({
      where: {
        serviceId: opts.serviceId,
        periodeId: perS1_2026.id,
        catalogueKpiId: opts.catalogueId,
      },
    })
    if (ex) return ex
    return prisma.kpiService.create({
      data: {
        catalogueKpiId: opts.catalogueId,
        serviceId: opts.serviceId,
        periodeId: perS1_2026.id,
        kpiDirectionId: opts.kpiDirId ?? undefined,
        poids_dans_direction: opts.poidsDir ?? undefined,
        cible: opts.cible,
        poids: opts.poids,
        statut: 'ACTIF',
        creeParId: opts.creeParId,
      },
    })
  }
  const kpiSrvInfra1 = await upsertKpiSrv({ catalogueId: cat17!.id, serviceId: srvInfra.id, kpiDirId: kpiDir1.id, poidsDir: 50, cible: 99.8, poids: 40, creeParId: usrCsInfra.id })
  const kpiSrvInfra2 = await upsertKpiSrv({ catalogueId: cat18!.id, serviceId: srvInfra.id, kpiDirId: kpiDir2.id, poidsDir: 60, cible: 3, poids: 35, creeParId: usrCsInfra.id })
  const kpiSrvInfra3 = await upsertKpiSrv({ catalogueId: cat21!.id, serviceId: srvInfra.id, kpiDirId: kpiDir1.id, poidsDir: 50, cible: 100, poids: 25, creeParId: usrCsInfra.id })
  const kpiSrvDev1 = await upsertKpiSrv({ catalogueId: cat19!.id, serviceId: srvDev.id, kpiDirId: kpiDir3.id, poidsDir: 100, cible: 80, poids: 35, creeParId: usrCsDev.id })
  const kpiSrvDev2 = await upsertKpiSrv({ catalogueId: cat22!.id, serviceId: srvDev.id, kpiDirId: kpiDir1.id, poidsDir: null, cible: 2, poids: 30, creeParId: usrCsDev.id })
  const kpiSrvDev3 = await upsertKpiSrv({ catalogueId: cat23!.id, serviceId: srvDev.id, kpiDirId: null, poidsDir: null, cible: 40, poids: 20, creeParId: usrCsDev.id })
  const kpiSrvDev4 = await upsertKpiSrv({ catalogueId: cat20!.id, serviceId: srvDev.id, kpiDirId: kpiDir4.id, poidsDir: 70, cible: 4.0, poids: 15, creeParId: usrCsDev.id })

  const upsertKpiEmp = async (opts: { catalogueId: number; employeId: number; assigneParId: number; kpiSrvId: number | null; cible: number; poids: number }) => {
    const ex = await prisma.kpiEmploye.findFirst({
      where: { employeId: opts.employeId, periodeId: perS1_2026.id, catalogueKpiId: opts.catalogueId },
    })
    if (ex) return
    await prisma.kpiEmploye.create({
      data: {
        catalogueKpiId: opts.catalogueId,
        employeId: opts.employeId,
        assigneParId: opts.assigneParId,
        kpiServiceId: opts.kpiSrvId ?? undefined,
        periodeId: perS1_2026.id,
        cible: opts.cible,
        poids: opts.poids,
        statut: 'VALIDE',
      },
    })
  }

  const empInfra1 = await prisma.user.findFirst({ where: { email: 'khalid.bennani@banque.ma' } })
  const empInfra2 = await prisma.user.findFirst({ where: { email: 'sanaa.elouafi@banque.ma' } })
  const empInfra3 = await prisma.user.findFirst({ where: { email: 'rachid.tlemcani@banque.ma' } })
  const empDev1 = await prisma.user.findFirst({ where: { email: 'amine.zouari@banque.ma' } })
  const empDev2 = await prisma.user.findFirst({ where: { email: 'fz.idali@banque.ma' } })
  const empDev3 = await prisma.user.findFirst({ where: { email: 'karim.naciri@banque.ma' } })

  if (empInfra1) {
    await upsertKpiEmp({ catalogueId: cat17!.id, employeId: empInfra1.id, assigneParId: usrMgrInfra.id, kpiSrvId: kpiSrvInfra1.id, cible: 99.9, poids: 40 })
    await upsertKpiEmp({ catalogueId: cat18!.id, employeId: empInfra1.id, assigneParId: usrMgrInfra.id, kpiSrvId: kpiSrvInfra2.id, cible: 2, poids: 35 })
    await upsertKpiEmp({ catalogueId: cat29!.id, employeId: empInfra1.id, assigneParId: usrMgrInfra.id, kpiSrvId: null, cible: 3, poids: 25 })
  }
  if (empInfra2) {
    await upsertKpiEmp({ catalogueId: cat17!.id, employeId: empInfra2.id, assigneParId: usrMgrInfra.id, kpiSrvId: kpiSrvInfra1.id, cible: 99.8, poids: 45 })
    await upsertKpiEmp({ catalogueId: cat18!.id, employeId: empInfra2.id, assigneParId: usrMgrInfra.id, kpiSrvId: kpiSrvInfra2.id, cible: 4, poids: 30 })
    await upsertKpiEmp({ catalogueId: cat14!.id, employeId: empInfra2.id, assigneParId: usrMgrInfra.id, kpiSrvId: null, cible: 3, poids: 25 })
  }
  if (empInfra3) {
    await upsertKpiEmp({ catalogueId: cat21!.id, employeId: empInfra3.id, assigneParId: usrMgrInfra.id, kpiSrvId: kpiSrvInfra3.id, cible: 100, poids: 50 })
    await upsertKpiEmp({ catalogueId: cat26!.id, employeId: empInfra3.id, assigneParId: usrMgrInfra.id, kpiSrvId: kpiSrvInfra2.id, cible: 80, poids: 30 })
    await upsertKpiEmp({ catalogueId: cat12!.id, employeId: empInfra3.id, assigneParId: usrMgrInfra.id, kpiSrvId: null, cible: 4.0, poids: 20 })
  }
  if (empDev1) {
    await upsertKpiEmp({ catalogueId: cat19!.id, employeId: empDev1.id, assigneParId: usrMgrDev.id, kpiSrvId: kpiSrvDev1.id, cible: 90, poids: 35 })
    await upsertKpiEmp({ catalogueId: cat24!.id, employeId: empDev1.id, assigneParId: usrMgrDev.id, kpiSrvId: kpiSrvDev2.id, cible: 80, poids: 30 })
    await upsertKpiEmp({ catalogueId: cat23!.id, employeId: empDev1.id, assigneParId: usrMgrDev.id, kpiSrvId: kpiSrvDev3.id, cible: 12, poids: 25 })
    await upsertKpiEmp({ catalogueId: cat30!.id, employeId: empDev1.id, assigneParId: usrMgrDev.id, kpiSrvId: null, cible: 3, poids: 10 })
  }
  if (empDev2) {
    await upsertKpiEmp({ catalogueId: cat19!.id, employeId: empDev2.id, assigneParId: usrMgrDev.id, kpiSrvId: kpiSrvDev1.id, cible: 90, poids: 35 })
    await upsertKpiEmp({ catalogueId: cat25!.id, employeId: empDev2.id, assigneParId: usrMgrDev.id, kpiSrvId: null, cible: 85, poids: 30 })
    await upsertKpiEmp({ catalogueId: cat22!.id, employeId: empDev2.id, assigneParId: usrMgrDev.id, kpiSrvId: kpiSrvDev2.id, cible: 3, poids: 25 })
    await upsertKpiEmp({ catalogueId: cat31!.id, employeId: empDev2.id, assigneParId: usrMgrDev.id, kpiSrvId: null, cible: 4, poids: 10 })
  }
  if (empDev3) {
    await upsertKpiEmp({ catalogueId: cat27!.id, employeId: empDev3.id, assigneParId: usrMgrDev.id, kpiSrvId: kpiSrvDev1.id, cible: 85, poids: 40 })
    await upsertKpiEmp({ catalogueId: cat20!.id, employeId: empDev3.id, assigneParId: usrMgrDev.id, kpiSrvId: kpiSrvDev4.id, cible: 4.2, poids: 30 })
    await upsertKpiEmp({ catalogueId: cat28!.id, employeId: empDev3.id, assigneParId: usrMgrDev.id, kpiSrvId: null, cible: 90, poids: 20 })
    await upsertKpiEmp({ catalogueId: cat15!.id, employeId: empDev3.id, assigneParId: usrMgrDev.id, kpiSrvId: null, cible: 3, poids: 10 })
  }

  await upsertKpiEmp({ catalogueId: cat6!.id, employeId: usrDirDsi.id, assigneParId: usrDg.id, kpiSrvId: null, cible: 100, poids: 35 })
  await upsertKpiEmp({ catalogueId: cat17!.id, employeId: usrDirDsi.id, assigneParId: usrDg.id, kpiSrvId: null, cible: 20, poids: 35 })
  await upsertKpiEmp({ catalogueId: cat15!.id, employeId: usrDirDsi.id, assigneParId: usrDg.id, kpiSrvId: null, cible: 4, poids: 30 })

  console.log('KPI DSI pour S1-2026 ajoutés avec succès.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
