// Seed DSI uniquement — à lancer sur une base déjà peuplée
// pnpm exec tsx prisma/seed-dsi.ts
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const PASSWORD_HASH = bcrypt.hashSync('Password123!', 10)

async function main() {
  const etab = await prisma.etablissement.findFirst()
  if (!etab) throw new Error('Aucun établissement. Lancez d\'abord le seed complet.')

  const usrDg = await prisma.user.findFirst({ where: { role: 'DG' } })
  if (!usrDg) throw new Error('Aucun DG. Lancez d\'abord le seed complet.')

  const perS1_2025 = await prisma.periode.findFirst({ where: { code: 'S1-2025' } })
  if (!perS1_2025) throw new Error('Période S1-2025 introuvable.')

  const cat6 = await prisma.catalogueKpi.findFirst({ where: { nom: 'Taux de réalisation budgétaire' } })
  const cat12 = await prisma.catalogueKpi.findFirst({ where: { nom: 'Qualité des rapports' } })
  const cat14 = await prisma.catalogueKpi.findFirst({ where: { nom: 'Gestion du risque' } })
  const cat15 = await prisma.catalogueKpi.findFirst({ where: { nom: 'Leadership et communication' } })
  if (!cat6 || !cat12 || !cat14 || !cat15) throw new Error('Catalogues 6, 12, 14 ou 15 introuvables.')

  const getOrCreateCatalogue = async (nom: string, type: 'QUANTITATIF' | 'QUALITATIF' | 'COMPORTEMENTAL', unite: string, mode: 'CUMUL' | 'MOYENNE' | 'DERNIER') => {
    const existing = await prisma.catalogueKpi.findFirst({ where: { nom } })
    if (existing) return existing.id
    const created = await prisma.catalogueKpi.create({ data: { nom, type, unite, mode_agregation: mode, actif: true } })
    return created.id
  }

  const dirDsi = await prisma.direction.findFirst({ where: { code: 'DIR_DSI' } })
  if (dirDsi) {
    console.log('Direction DSI déjà présente. Seed DSI ignoré.')
    return
  }

  const dirDsiNew = await prisma.direction.create({
    data: { nom: 'Direction des Systèmes d\'Information', code: 'DIR_DSI', etablissementId: etab.id, actif: true },
  })
  const srvInfra = await prisma.service.create({
    data: { nom: 'Infrastructure & Exploitation', code: 'SRV_INFRA', directionId: dirDsiNew.id, actif: true },
  })
  const srvDev = await prisma.service.create({
    data: { nom: 'Développement & Projets', code: 'SRV_DEV', directionId: dirDsiNew.id, actif: true },
  })

  const usrDirDsi = await upsertUser({ nom: 'Mansouri', prenom: 'Rachid', email: 'dir.dsi@banque.ma', role: 'DIRECTEUR', directionId: dirDsiNew.id, serviceId: null, managerId: usrDg.id })
  const usrCsInfra = await upsertUser({ nom: 'Boutaleb', prenom: 'Imane', email: 'chef.infra@banque.ma', role: 'CHEF_SERVICE', directionId: null, serviceId: srvInfra.id, managerId: usrDirDsi.id })
  const usrCsDev = await upsertUser({ nom: 'Chraibi', prenom: 'Nabil', email: 'chef.dev@banque.ma', role: 'CHEF_SERVICE', directionId: null, serviceId: srvDev.id, managerId: usrDirDsi.id })
  const usrMgrInfra = await upsertUser({ nom: 'Ait Brahim', prenom: 'Youssef', email: 'manager.infra@banque.ma', role: 'MANAGER', directionId: null, serviceId: srvInfra.id, managerId: usrCsInfra.id })
  const usrMgrDev = await upsertUser({ nom: 'Saidi', prenom: 'Houda', email: 'manager.dev@banque.ma', role: 'MANAGER', directionId: null, serviceId: srvDev.id, managerId: usrCsDev.id })
  const usrEmpInfra1 = await upsertUser({ nom: 'Bennani', prenom: 'Khalid', email: 'khalid.bennani@banque.ma', role: 'EMPLOYE', directionId: null, serviceId: srvInfra.id, managerId: usrMgrInfra.id })
  const usrEmpInfra2 = await upsertUser({ nom: 'El Ouafi', prenom: 'Sanaa', email: 'sanaa.elouafi@banque.ma', role: 'EMPLOYE', directionId: null, serviceId: srvInfra.id, managerId: usrMgrInfra.id })
  const usrEmpInfra3 = await upsertUser({ nom: 'Tlemcani', prenom: 'Rachid', email: 'rachid.tlemcani@banque.ma', role: 'EMPLOYE', directionId: null, serviceId: srvInfra.id, managerId: usrMgrInfra.id })
  const usrEmpDev1 = await upsertUser({ nom: 'Zouari', prenom: 'Amine', email: 'amine.zouari@banque.ma', role: 'EMPLOYE', directionId: null, serviceId: srvDev.id, managerId: usrMgrDev.id })
  const usrEmpDev2 = await upsertUser({ nom: 'Idali', prenom: 'Fatima Zahra', email: 'fz.idali@banque.ma', role: 'EMPLOYE', directionId: null, serviceId: srvDev.id, managerId: usrMgrDev.id })
  const usrEmpDev3 = await upsertUser({ nom: 'Naciri', prenom: 'Karim', email: 'karim.naciri@banque.ma', role: 'EMPLOYE', directionId: null, serviceId: srvDev.id, managerId: usrMgrDev.id })

  await prisma.direction.update({ where: { id: dirDsiNew.id }, data: { responsableId: usrDirDsi.id } })
  await prisma.service.update({ where: { id: srvInfra.id }, data: { responsableId: usrCsInfra.id } })
  await prisma.service.update({ where: { id: srvDev.id }, data: { responsableId: usrCsDev.id } })

  const cat17 = await getOrCreateCatalogue('Disponibilité systèmes', 'QUANTITATIF', '%', 'MOYENNE')
  const cat18 = await getOrCreateCatalogue('Délai résolution incidents', 'QUANTITATIF', 'heures', 'MOYENNE')
  const cat19 = await getOrCreateCatalogue('Livraison projets dans les délais', 'QUANTITATIF', '%', 'MOYENNE')
  const cat20 = await getOrCreateCatalogue('Satisfaction utilisateurs internes', 'QUALITATIF', '/5', 'MOYENNE')
  const cat21 = await getOrCreateCatalogue('Taux sauvegardes réussies', 'QUANTITATIF', '%', 'MOYENNE')
  const cat22 = await getOrCreateCatalogue('Taux bugs post-livraison', 'QUANTITATIF', '%', 'MOYENNE')
  const cat23 = await getOrCreateCatalogue('Vélocité équipe (story points)', 'QUANTITATIF', 'SP/sprint', 'MOYENNE')
  const cat24 = await getOrCreateCatalogue('Couverture tests unitaires', 'QUANTITATIF', '%', 'MOYENNE')
  const cat25 = await getOrCreateCatalogue('Score accessibilité Lighthouse', 'QUANTITATIF', 'score', 'MOYENNE')
  const cat26 = await getOrCreateCatalogue('Tickets N1 traités', 'QUANTITATIF', 'tickets', 'CUMUL')
  const cat27 = await getOrCreateCatalogue('Jalons projets livrés', 'QUANTITATIF', '%', 'MOYENNE')
  const cat28 = await getOrCreateCatalogue('Risques identifiés et mitigés', 'QUANTITATIF', '%', 'MOYENNE')
  const cat29 = await getOrCreateCatalogue('Maîtrise outils supervision', 'COMPORTEMENTAL', 'niveau/4', 'DERNIER')
  const cat30 = await getOrCreateCatalogue('Qualité du code', 'COMPORTEMENTAL', 'niveau/4', 'DERNIER')
  const cat31 = await getOrCreateCatalogue('Maîtrise Next.js/TypeScript', 'COMPORTEMENTAL', 'niveau/4', 'DERNIER')

  const kpiDirDsi1 = await prisma.kpiDirection.create({ data: { catalogueKpiId: cat17, directionId: dirDsiNew.id, periodeId: perS1_2025.id, cible: 99.5, poids: 35, statut: 'ACTIF', creeParId: usrDirDsi.id } })
  const kpiDirDsi2 = await prisma.kpiDirection.create({ data: { catalogueKpiId: cat18, directionId: dirDsiNew.id, periodeId: perS1_2025.id, cible: 4, poids: 30, statut: 'ACTIF', creeParId: usrDirDsi.id } })
  const kpiDirDsi3 = await prisma.kpiDirection.create({ data: { catalogueKpiId: cat19, directionId: dirDsiNew.id, periodeId: perS1_2025.id, cible: 80, poids: 25, statut: 'ACTIF', creeParId: usrDirDsi.id } })
  const kpiDirDsi4 = await prisma.kpiDirection.create({ data: { catalogueKpiId: cat20, directionId: dirDsiNew.id, periodeId: perS1_2025.id, cible: 4.0, poids: 10, statut: 'ACTIF', creeParId: usrDirDsi.id } })

  const kpiSrvInfra1 = await prisma.kpiService.create({ data: { catalogueKpiId: cat17, serviceId: srvInfra.id, periodeId: perS1_2025.id, kpiDirectionId: kpiDirDsi1.id, poids_dans_direction: 50, cible: 99.8, poids: 40, statut: 'ACTIF', creeParId: usrCsInfra.id } })
  const kpiSrvInfra2 = await prisma.kpiService.create({ data: { catalogueKpiId: cat18, serviceId: srvInfra.id, periodeId: perS1_2025.id, kpiDirectionId: kpiDirDsi2.id, poids_dans_direction: 60, cible: 3, poids: 35, statut: 'ACTIF', creeParId: usrCsInfra.id } })
  const kpiSrvInfra3 = await prisma.kpiService.create({ data: { catalogueKpiId: cat21, serviceId: srvInfra.id, periodeId: perS1_2025.id, kpiDirectionId: kpiDirDsi1.id, poids_dans_direction: 50, cible: 100, poids: 25, statut: 'ACTIF', creeParId: usrCsInfra.id } })
  const kpiSrvDev1 = await prisma.kpiService.create({ data: { catalogueKpiId: cat19, serviceId: srvDev.id, periodeId: perS1_2025.id, kpiDirectionId: kpiDirDsi3.id, poids_dans_direction: 100, cible: 80, poids: 35, statut: 'ACTIF', creeParId: usrCsDev.id } })
  const kpiSrvDev2 = await prisma.kpiService.create({ data: { catalogueKpiId: cat22, serviceId: srvDev.id, periodeId: perS1_2025.id, kpiDirectionId: kpiDirDsi1.id, poids_dans_direction: null, cible: 2, poids: 30, statut: 'ACTIF', creeParId: usrCsDev.id } })
  const kpiSrvDev3 = await prisma.kpiService.create({ data: { catalogueKpiId: cat23, serviceId: srvDev.id, periodeId: perS1_2025.id, kpiDirectionId: null, poids_dans_direction: null, cible: 40, poids: 20, statut: 'ACTIF', creeParId: usrCsDev.id } })
  const kpiSrvDev4 = await prisma.kpiService.create({ data: { catalogueKpiId: cat20, serviceId: srvDev.id, periodeId: perS1_2025.id, kpiDirectionId: kpiDirDsi4.id, poids_dans_direction: 70, cible: 4.0, poids: 15, statut: 'ACTIF', creeParId: usrCsDev.id } })

  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat17, employeId: usrEmpInfra1.id, assigneParId: usrMgrInfra.id, kpiServiceId: kpiSrvInfra1.id, periodeId: perS1_2025.id, cible: 99.9, poids: 40, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat18, employeId: usrEmpInfra1.id, assigneParId: usrMgrInfra.id, kpiServiceId: kpiSrvInfra2.id, periodeId: perS1_2025.id, cible: 2, poids: 35, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat29, employeId: usrEmpInfra1.id, assigneParId: usrMgrInfra.id, kpiServiceId: null, periodeId: perS1_2025.id, cible: 3, poids: 25, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat17, employeId: usrEmpInfra2.id, assigneParId: usrMgrInfra.id, kpiServiceId: kpiSrvInfra1.id, periodeId: perS1_2025.id, cible: 99.8, poids: 45, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat18, employeId: usrEmpInfra2.id, assigneParId: usrMgrInfra.id, kpiServiceId: kpiSrvInfra2.id, periodeId: perS1_2025.id, cible: 4, poids: 30, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat14.id, employeId: usrEmpInfra2.id, assigneParId: usrMgrInfra.id, kpiServiceId: null, periodeId: perS1_2025.id, cible: 3, poids: 25, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat21, employeId: usrEmpInfra3.id, assigneParId: usrMgrInfra.id, kpiServiceId: kpiSrvInfra3.id, periodeId: perS1_2025.id, cible: 100, poids: 50, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat26, employeId: usrEmpInfra3.id, assigneParId: usrMgrInfra.id, kpiServiceId: kpiSrvInfra2.id, periodeId: perS1_2025.id, cible: 80, poids: 30, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat12.id, employeId: usrEmpInfra3.id, assigneParId: usrMgrInfra.id, kpiServiceId: null, periodeId: perS1_2025.id, cible: 4.0, poids: 20, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat19, employeId: usrEmpDev1.id, assigneParId: usrMgrDev.id, kpiServiceId: kpiSrvDev1.id, periodeId: perS1_2025.id, cible: 90, poids: 35, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat24, employeId: usrEmpDev1.id, assigneParId: usrMgrDev.id, kpiServiceId: kpiSrvDev2.id, periodeId: perS1_2025.id, cible: 80, poids: 30, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat23, employeId: usrEmpDev1.id, assigneParId: usrMgrDev.id, kpiServiceId: kpiSrvDev3.id, periodeId: perS1_2025.id, cible: 12, poids: 25, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat30, employeId: usrEmpDev1.id, assigneParId: usrMgrDev.id, kpiServiceId: null, periodeId: perS1_2025.id, cible: 3, poids: 10, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat19, employeId: usrEmpDev2.id, assigneParId: usrMgrDev.id, kpiServiceId: kpiSrvDev1.id, periodeId: perS1_2025.id, cible: 90, poids: 35, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat25, employeId: usrEmpDev2.id, assigneParId: usrMgrDev.id, kpiServiceId: null, periodeId: perS1_2025.id, cible: 85, poids: 30, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat22, employeId: usrEmpDev2.id, assigneParId: usrMgrDev.id, kpiServiceId: kpiSrvDev2.id, periodeId: perS1_2025.id, cible: 3, poids: 25, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat31, employeId: usrEmpDev2.id, assigneParId: usrMgrDev.id, kpiServiceId: null, periodeId: perS1_2025.id, cible: 4, poids: 10, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat27, employeId: usrEmpDev3.id, assigneParId: usrMgrDev.id, kpiServiceId: kpiSrvDev1.id, periodeId: perS1_2025.id, cible: 85, poids: 40, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat20, employeId: usrEmpDev3.id, assigneParId: usrMgrDev.id, kpiServiceId: kpiSrvDev4.id, periodeId: perS1_2025.id, cible: 4.2, poids: 30, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat28, employeId: usrEmpDev3.id, assigneParId: usrMgrDev.id, kpiServiceId: null, periodeId: perS1_2025.id, cible: 90, poids: 20, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat15.id, employeId: usrEmpDev3.id, assigneParId: usrMgrDev.id, kpiServiceId: null, periodeId: perS1_2025.id, cible: 3, poids: 10, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat6.id, employeId: usrDirDsi.id, assigneParId: usrDg.id, kpiServiceId: null, periodeId: perS1_2025.id, cible: 100, poids: 35, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat17, employeId: usrDirDsi.id, assigneParId: usrDg.id, kpiServiceId: null, periodeId: perS1_2025.id, cible: 20, poids: 35, statut: 'VALIDE' } })
  await prisma.kpiEmploye.create({ data: { catalogueKpiId: cat15.id, employeId: usrDirDsi.id, assigneParId: usrDg.id, kpiServiceId: null, periodeId: perS1_2025.id, cible: 4, poids: 30, statut: 'VALIDE' } })

  console.log('Seed DSI terminé avec succès.')
}

async function upsertUser(u: {
  nom: string
  prenom: string
  email: string
  role: 'DIRECTEUR' | 'CHEF_SERVICE' | 'MANAGER' | 'EMPLOYE'
  directionId: number | null
  serviceId: number | null
  managerId: number
}) {
  const existing = await prisma.user.findUnique({ where: { email: u.email } })
  if (existing) return existing
  return prisma.user.create({
    data: {
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      password: PASSWORD_HASH,
      role: u.role,
      directionId: u.directionId ?? undefined,
      serviceId: u.serviceId ?? undefined,
      managerId: u.managerId,
      actif: true,
      force_password_change: false,
    },
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
