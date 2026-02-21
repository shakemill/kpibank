// Seed cohérent pour la gestion KPI bancaire.
// Avant de lancer : npx prisma migrate reset --force (réinitialise la DB puis réapplique les migrations).
// Puis : npx prisma db seed
//
// Charger .env puis .env.local pour utiliser la même DATABASE_URL que Next.js
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

/** Date limite de saisie = 10 du mois suivant la fin de période */
function dateLimiteSaisie(annee: number, moisFin: number): Date {
  const moisSuivant = moisFin === 12 ? 1 : moisFin + 1
  const anneeSuivante = moisFin === 12 ? annee + 1 : annee
  return new Date(anneeSuivante, moisSuivant - 1, 10)
}

async function main() {
  const now = new Date()

  // ─────────────────────────────────────────
  // 1. ÉTABLISSEMENT
  // ─────────────────────────────────────────
  const etab = await prisma.etablissement.create({
    data: {
      nom: 'Banque Nationale de Développement',
      actif: true,
    },
  })

  // ─────────────────────────────────────────
  // 2. PÉRIODES
  // ─────────────────────────────────────────
  const perS1_2025 = await prisma.periode.create({
    data: {
      type: 'SEMESTRIEL',
      code: 'S1-2025',
      mois_debut: 1,
      mois_fin: 6,
      annee: 2025,
      date_debut: new Date('2025-01-01'),
      date_fin: new Date('2025-06-30'),
      date_limite_saisie: dateLimiteSaisie(2025, 6),
      statut: 'EN_COURS',
      actif: true,
    },
  })
  const perS2_2025 = await prisma.periode.create({
    data: {
      type: 'SEMESTRIEL',
      code: 'S2-2025',
      mois_debut: 7,
      mois_fin: 12,
      annee: 2025,
      date_debut: new Date('2025-07-01'),
      date_fin: new Date('2025-12-31'),
      date_limite_saisie: dateLimiteSaisie(2025, 12),
      statut: 'A_VENIR',
      actif: true,
    },
  })
  const perT1_2025 = await prisma.periode.create({
    data: {
      type: 'TRIMESTRIEL',
      code: 'T1-2025',
      mois_debut: 1,
      mois_fin: 3,
      annee: 2025,
      date_debut: new Date('2025-01-01'),
      date_fin: new Date('2025-03-31'),
      date_limite_saisie: dateLimiteSaisie(2025, 3),
      statut: 'EN_COURS',
      actif: true,
    },
  })
  const perT2_2025 = await prisma.periode.create({
    data: {
      type: 'TRIMESTRIEL',
      code: 'T2-2025',
      mois_debut: 4,
      mois_fin: 6,
      annee: 2025,
      date_debut: new Date('2025-04-01'),
      date_fin: new Date('2025-06-30'),
      date_limite_saisie: dateLimiteSaisie(2025, 6),
      statut: 'A_VENIR',
      actif: true,
    },
  })
  const perT3_2025 = await prisma.periode.create({
    data: {
      type: 'TRIMESTRIEL',
      code: 'T3-2025',
      mois_debut: 7,
      mois_fin: 9,
      annee: 2025,
      date_debut: new Date('2025-07-01'),
      date_fin: new Date('2025-09-30'),
      date_limite_saisie: dateLimiteSaisie(2025, 9),
      statut: 'A_VENIR',
      actif: true,
    },
  })
  const perT4_2025 = await prisma.periode.create({
    data: {
      type: 'TRIMESTRIEL',
      code: 'T4-2025',
      mois_debut: 10,
      mois_fin: 12,
      annee: 2025,
      date_debut: new Date('2025-10-01'),
      date_fin: new Date('2025-12-31'),
      date_limite_saisie: dateLimiteSaisie(2025, 12),
      statut: 'A_VENIR',
      actif: true,
    },
  })

  // ─────────────────────────────────────────
  // 3. DIRECTIONS
  // ─────────────────────────────────────────
  const dirCom = await prisma.direction.create({
    data: {
      nom: 'Direction Commerciale',
      code: 'DIR_COM',
      etablissementId: etab.id,
      actif: true,
    },
  })
  const dirRis = await prisma.direction.create({
    data: {
      nom: 'Direction des Risques',
      code: 'DIR_RIS',
      etablissementId: etab.id,
      actif: true,
    },
  })
  const dirRh = await prisma.direction.create({
    data: {
      nom: 'Direction du Capital Humain',
      code: 'DIR_RH',
      etablissementId: etab.id,
      actif: true,
    },
  })

  // ─────────────────────────────────────────
  // 4. SERVICES
  // ─────────────────────────────────────────
  const srvPme = await prisma.service.create({
    data: {
      nom: 'Service Crédits PME',
      code: 'SRV_PME',
      directionId: dirCom.id,
      actif: true,
    },
  })
  const srvCorp = await prisma.service.create({
    data: {
      nom: 'Service Crédits Corporate',
      code: 'SRV_CORP',
      directionId: dirCom.id,
      actif: true,
    },
  })
  const srvRcred = await prisma.service.create({
    data: {
      nom: 'Service Risque de Crédit',
      code: 'SRV_RCRED',
      directionId: dirRis.id,
      actif: true,
    },
  })
  const srvRop = await prisma.service.create({
    data: {
      nom: 'Service Risque Opérationnel',
      code: 'SRV_ROP',
      directionId: dirRis.id,
      actif: true,
    },
  })
  const srvRec = await prisma.service.create({
    data: {
      nom: 'Service Recrutement',
      code: 'SRV_REC',
      directionId: dirRh.id,
      actif: true,
    },
  })
  const srvForm = await prisma.service.create({
    data: {
      nom: 'Service Formation',
      code: 'SRV_FORM',
      directionId: dirRh.id,
      actif: true,
    },
  })

  // ─────────────────────────────────────────
  // 5. UTILISATEURS (DG → Directeurs → Chefs → Managers → Employés)
  // ─────────────────────────────────────────
  const usrDg = await prisma.user.create({
    data: {
      nom: 'Benali',
      prenom: 'Youssef',
      email: 'youssef.benali@banque.ma',
      password: PASSWORD_HASH,
      role: 'DG',
      actif: true,
      force_password_change: false,
    },
  })

  const usrDirCom = await prisma.user.create({
    data: {
      nom: 'Tazi',
      prenom: 'Karim',
      email: 'dir.commercial@banque.ma',
      password: PASSWORD_HASH,
      role: 'DIRECTEUR',
      directionId: dirCom.id,
      managerId: usrDg.id,
      actif: true,
      force_password_change: false,
    },
  })
  const usrDirRis = await prisma.user.create({
    data: {
      nom: 'Alaoui',
      prenom: 'Nadia',
      email: 'dir.risques@banque.ma',
      password: PASSWORD_HASH,
      role: 'DIRECTEUR',
      directionId: dirRis.id,
      managerId: usrDg.id,
      actif: true,
      force_password_change: false,
    },
  })
  const usrDirRh = await prisma.user.create({
    data: {
      nom: 'Chraibi',
      prenom: 'Fatima',
      email: 'dir.rh@banque.ma',
      password: PASSWORD_HASH,
      role: 'DIRECTEUR',
      directionId: dirRh.id,
      managerId: usrDg.id,
      actif: true,
      force_password_change: false,
    },
  })

  // Assistante de direction — rattachée directement à la direction (sans service)
  await prisma.user.create({
    data: {
      nom: 'Alami',
      prenom: 'Samira',
      email: 'assistante.dir.commercial@banque.ma',
      password: PASSWORD_HASH,
      role: 'EMPLOYE',
      directionId: dirCom.id,
      serviceId: null,
      managerId: usrDirCom.id,
      actif: true,
      force_password_change: false,
    },
  })

  const usrCsPme = await prisma.user.create({
    data: {
      nom: 'Fassi',
      prenom: 'Omar',
      email: 'chef.pme@banque.ma',
      password: PASSWORD_HASH,
      role: 'CHEF_SERVICE',
      serviceId: srvPme.id,
      managerId: usrDirCom.id,
      actif: true,
      force_password_change: false,
    },
  })
  const usrCsCorp = await prisma.user.create({
    data: {
      nom: 'Berrada',
      prenom: 'Leila',
      email: 'chef.corp@banque.ma',
      password: PASSWORD_HASH,
      role: 'CHEF_SERVICE',
      serviceId: srvCorp.id,
      managerId: usrDirCom.id,
      actif: true,
      force_password_change: false,
    },
  })
  const usrCsRcred = await prisma.user.create({
    data: {
      nom: 'Kettani',
      prenom: 'Mehdi',
      email: 'chef.rcred@banque.ma',
      password: PASSWORD_HASH,
      role: 'CHEF_SERVICE',
      serviceId: srvRcred.id,
      managerId: usrDirRis.id,
      actif: true,
      force_password_change: false,
    },
  })
  const usrCsRop = await prisma.user.create({
    data: {
      nom: 'Benjelloun',
      prenom: 'Samir',
      email: 'chef.rop@banque.ma',
      password: PASSWORD_HASH,
      role: 'CHEF_SERVICE',
      serviceId: srvRop.id,
      managerId: usrDirRis.id,
      actif: true,
      force_password_change: false,
    },
  })
  const usrCsRec = await prisma.user.create({
    data: {
      nom: 'Lahlou',
      prenom: 'Zineb',
      email: 'chef.rec@banque.ma',
      password: PASSWORD_HASH,
      role: 'CHEF_SERVICE',
      serviceId: srvRec.id,
      managerId: usrDirRh.id,
      actif: true,
      force_password_change: false,
    },
  })
  const usrCsForm = await prisma.user.create({
    data: {
      nom: 'Rahimi',
      prenom: 'Anas',
      email: 'chef.form@banque.ma',
      password: PASSWORD_HASH,
      role: 'CHEF_SERVICE',
      serviceId: srvForm.id,
      managerId: usrDirRh.id,
      actif: true,
      force_password_change: false,
    },
  })

  const usrMgrPme = await prisma.user.create({
    data: {
      nom: 'Idrissi',
      prenom: 'Hassan',
      email: 'manager.pme@banque.ma',
      password: PASSWORD_HASH,
      role: 'MANAGER',
      serviceId: srvPme.id,
      managerId: usrCsPme.id,
      actif: true,
      force_password_change: false,
    },
  })
  const usrMgrCorp = await prisma.user.create({
    data: {
      nom: 'Bennis',
      prenom: 'Sara',
      email: 'manager.corp@banque.ma',
      password: PASSWORD_HASH,
      role: 'MANAGER',
      serviceId: srvCorp.id,
      managerId: usrCsCorp.id,
      actif: true,
      force_password_change: false,
    },
  })

  const usrEmp1 = await prisma.user.create({
    data: {
      nom: 'Ouali',
      prenom: 'Mehdi',
      email: 'mehdi.ouali@banque.ma',
      password: PASSWORD_HASH,
      role: 'EMPLOYE',
      serviceId: srvPme.id,
      managerId: usrMgrPme.id,
      actif: true,
      force_password_change: false,
    },
  })
  await prisma.user.create({
    data: {
      nom: 'Tahiri',
      prenom: 'Rim',
      email: 'rim.tahiri@banque.ma',
      password: PASSWORD_HASH,
      role: 'EMPLOYE',
      serviceId: srvPme.id,
      managerId: usrMgrPme.id,
      actif: true,
      force_password_change: false,
    },
  })
  await prisma.user.create({
    data: {
      nom: 'Benkiran',
      prenom: 'Yassine',
      email: 'yassine.benkiran@banque.ma',
      password: PASSWORD_HASH,
      role: 'EMPLOYE',
      serviceId: srvPme.id,
      managerId: usrMgrPme.id,
      actif: true,
      force_password_change: false,
    },
  })
  await prisma.user.create({
    data: {
      nom: 'Mrani',
      prenom: 'Dounia',
      email: 'dounia.mrani@banque.ma',
      password: PASSWORD_HASH,
      role: 'EMPLOYE',
      serviceId: srvPme.id,
      managerId: usrMgrPme.id,
      actif: true,
      force_password_change: false,
    },
  })
  await prisma.user.create({
    data: {
      nom: 'Cherkaoui',
      prenom: 'Hamid',
      email: 'hamid.cherkaoui@banque.ma',
      password: PASSWORD_HASH,
      role: 'EMPLOYE',
      serviceId: srvCorp.id,
      managerId: usrMgrCorp.id,
      actif: true,
      force_password_change: false,
    },
  })
  await prisma.user.create({
    data: {
      nom: 'Squalli',
      prenom: 'Hajar',
      email: 'hajar.squalli@banque.ma',
      password: PASSWORD_HASH,
      role: 'EMPLOYE',
      serviceId: srvCorp.id,
      managerId: usrMgrCorp.id,
      actif: true,
      force_password_change: false,
    },
  })

  // ─────────────────────────────────────────
  // 6. RESPONSABLES (directions et services)
  // ─────────────────────────────────────────
  await prisma.direction.update({ where: { id: dirCom.id }, data: { responsableId: usrDirCom.id } })
  await prisma.direction.update({ where: { id: dirRis.id }, data: { responsableId: usrDirRis.id } })
  await prisma.direction.update({ where: { id: dirRh.id }, data: { responsableId: usrDirRh.id } })
  await prisma.service.update({ where: { id: srvPme.id }, data: { responsableId: usrCsPme.id } })
  await prisma.service.update({ where: { id: srvCorp.id }, data: { responsableId: usrCsCorp.id } })
  await prisma.service.update({ where: { id: srvRcred.id }, data: { responsableId: usrCsRcred.id } })
  await prisma.service.update({ where: { id: srvRop.id }, data: { responsableId: usrCsRop.id } })
  await prisma.service.update({ where: { id: srvRec.id }, data: { responsableId: usrCsRec.id } })
  await prisma.service.update({ where: { id: srvForm.id }, data: { responsableId: usrCsForm.id } })

  // ─────────────────────────────────────────
  // 7. PARAMÈTRES
  // ─────────────────────────────────────────
  await prisma.parametre.createMany({
    data: [
      { cle: 'DELAI_SAISIE_JOUR', valeur: '10', description: 'Jour limite de saisie du mois M+1', modifieParId: usrDg.id, modifie_le: now },
      { cle: 'DELAI_VALIDATION_JOURS', valeur: '5', description: 'Jours ouvrés pour valider une saisie après soumission', modifieParId: usrDg.id, modifie_le: now },
      { cle: 'DELAI_ACCEPTATION_KPI_JOURS', valeur: '3', description: 'Jours pour accepter/contester un KPI après notification', modifieParId: usrDg.id, modifie_le: now },
      { cle: 'DELAI_REPONSE_CONTESTATION_JOURS', valeur: '5', description: 'Jours ouvrés pour répondre à une contestation', modifieParId: usrDg.id, modifie_le: now },
      { cle: 'RAPPEL_J_MOINS_3', valeur: 'true', description: 'Envoyer rappel 3 jours avant la date limite', modifieParId: usrDg.id, modifie_le: now },
      { cle: 'RAPPEL_J_MOINS_1', valeur: 'true', description: 'Envoyer rappel la veille de la date limite', modifieParId: usrDg.id, modifie_le: now },
      { cle: 'PENALITE_SAISIE_MANQUANTE', valeur: 'ZERO', description: 'ZERO = compte comme 0% | MALUS_10 = pénalité 10pts', modifieParId: usrDg.id, modifie_le: now },
      { cle: 'ESCALADE_VALIDATION_JOURS', valeur: '7', description: 'Jours avant escalade au chef de service si non validé', modifieParId: usrDg.id, modifie_le: now },
    ],
  })

  // ─────────────────────────────────────────
  // 8. CATALOGUE KPI
  // ─────────────────────────────────────────
  const cat1 = await prisma.catalogueKpi.create({
    data: { nom: 'Volume crédits accordés', unite: 'M MAD', type: 'QUANTITATIF', mode_agregation: 'CUMUL', actif: true },
  })
  const cat2 = await prisma.catalogueKpi.create({
    data: { nom: 'Nombre de dossiers traités', unite: 'dossiers', type: 'QUANTITATIF', mode_agregation: 'CUMUL', actif: true },
  })
  const cat3 = await prisma.catalogueKpi.create({
    data: { nom: 'Nombre de nouveaux clients', unite: 'clients', type: 'QUANTITATIF', mode_agregation: 'CUMUL', actif: true },
  })
  const cat4 = await prisma.catalogueKpi.create({
    data: { nom: 'Taux de recouvrement', unite: '%', type: 'QUANTITATIF', mode_agregation: 'MOYENNE', actif: true },
  })
  const cat5 = await prisma.catalogueKpi.create({
    data: { nom: 'Délai moyen traitement dossier', unite: 'jours', type: 'QUANTITATIF', mode_agregation: 'MOYENNE', actif: true },
  })
  const cat6 = await prisma.catalogueKpi.create({
    data: { nom: 'Taux de réalisation budgétaire', unite: '%', type: 'QUANTITATIF', mode_agregation: 'MOYENNE', actif: true },
  })
  const cat7 = await prisma.catalogueKpi.create({
    data: { nom: "Nombre de reportings remis à temps", unite: 'rapports', type: 'QUANTITATIF', mode_agregation: 'CUMUL', actif: true },
  })
  const cat8 = await prisma.catalogueKpi.create({
    data: { nom: "Taux de complétion des entretiens", unite: '%', type: 'QUANTITATIF', mode_agregation: 'MOYENNE', actif: true },
  })
  const cat9 = await prisma.catalogueKpi.create({
    data: { nom: "Score moyen de l'équipe", unite: '%', type: 'QUANTITATIF', mode_agregation: 'MOYENNE', actif: true },
  })
  const cat10 = await prisma.catalogueKpi.create({
    data: { nom: "Délai moyen de validation saisies", unite: 'jours', type: 'QUANTITATIF', mode_agregation: 'MOYENNE', actif: true },
  })
  const cat11 = await prisma.catalogueKpi.create({
    data: { nom: 'Satisfaction client', unite: '/5', type: 'QUALITATIF', mode_agregation: 'MOYENNE', actif: true },
  })
  const cat12 = await prisma.catalogueKpi.create({
    data: { nom: 'Qualité des rapports', unite: '/5', type: 'QUALITATIF', mode_agregation: 'MOYENNE', actif: true },
  })
  const cat13 = await prisma.catalogueKpi.create({
    data: { nom: 'Maîtrise des outils CRM', unite: 'niveau/4', type: 'COMPORTEMENTAL', mode_agregation: 'DERNIER', actif: true },
  })
  const cat14 = await prisma.catalogueKpi.create({
    data: { nom: 'Gestion du risque', unite: 'niveau/4', type: 'COMPORTEMENTAL', mode_agregation: 'DERNIER', actif: true },
  })
  const cat15 = await prisma.catalogueKpi.create({
    data: { nom: 'Leadership et communication', unite: 'niveau/4', type: 'COMPORTEMENTAL', mode_agregation: 'DERNIER', actif: true },
  })
  const cat16 = await prisma.catalogueKpi.create({
    data: { nom: 'Développement des équipes', unite: 'niveau/4', type: 'COMPORTEMENTAL', mode_agregation: 'DERNIER', actif: true },
  })

  // ─────────────────────────────────────────
  // 9. KPI DIRECTION — Direction Commerciale / S1-2025
  // ─────────────────────────────────────────
  const kpiDir1 = await prisma.kpiDirection.create({
    data: {
      catalogueKpiId: cat1.id,
      directionId: dirCom.id,
      periodeId: perS1_2025.id,
      cible: 500,
      poids: 40,
      statut: 'ACTIF',
      creeParId: usrDirCom.id,
    },
  })
  const kpiDir2 = await prisma.kpiDirection.create({
    data: {
      catalogueKpiId: cat3.id,
      directionId: dirCom.id,
      periodeId: perS1_2025.id,
      cible: 2000,
      poids: 35,
      statut: 'ACTIF',
      creeParId: usrDirCom.id,
    },
  })
  const kpiDir3 = await prisma.kpiDirection.create({
    data: {
      catalogueKpiId: cat11.id,
      directionId: dirCom.id,
      periodeId: perS1_2025.id,
      cible: 4.2,
      poids: 25,
      statut: 'ACTIF',
      creeParId: usrDirCom.id,
    },
  })

  // ─────────────────────────────────────────
  // 10. KPI SERVICE — Service PME / S1-2025
  // ─────────────────────────────────────────
  const kpiSrv1 = await prisma.kpiService.create({
    data: {
      catalogueKpiId: cat1.id,
      serviceId: srvPme.id,
      periodeId: perS1_2025.id,
      kpiDirectionId: kpiDir1.id,
      poids_dans_direction: 40,
      cible: 200,
      poids: 35,
      statut: 'ACTIF',
      creeParId: usrCsPme.id,
    },
  })
  const kpiSrv2 = await prisma.kpiService.create({
    data: {
      catalogueKpiId: cat2.id,
      serviceId: srvPme.id,
      periodeId: perS1_2025.id,
      kpiDirectionId: kpiDir1.id,
      poids_dans_direction: 60,
      cible: 900,
      poids: 40,
      statut: 'ACTIF',
      creeParId: usrCsPme.id,
    },
  })
  const kpiSrv3 = await prisma.kpiService.create({
    data: {
      catalogueKpiId: cat11.id,
      serviceId: srvPme.id,
      periodeId: perS1_2025.id,
      kpiDirectionId: kpiDir3.id,
      poids_dans_direction: 50,
      cible: 4.0,
      poids: 25,
      statut: 'ACTIF',
      creeParId: usrCsPme.id,
    },
  })

  // ─────────────────────────────────────────
  // 11. KPI EMPLOYÉ — Mehdi Ouali / S1-2025 / statut VALIDE
  // ─────────────────────────────────────────
  const kpiEmp1 = await prisma.kpiEmploye.create({
    data: {
      catalogueKpiId: cat2.id,
      employeId: usrEmp1.id,
      assigneParId: usrMgrPme.id,
      kpiServiceId: kpiSrv2.id,
      periodeId: perS1_2025.id,
      cible: 15,
      poids: 40,
      statut: 'VALIDE',
    },
  })
  const kpiEmp2 = await prisma.kpiEmploye.create({
    data: {
      catalogueKpiId: cat11.id,
      employeId: usrEmp1.id,
      assigneParId: usrMgrPme.id,
      kpiServiceId: kpiSrv3.id,
      periodeId: perS1_2025.id,
      cible: 4.0,
      poids: 35,
      statut: 'VALIDE',
    },
  })
  const kpiEmp3 = await prisma.kpiEmploye.create({
    data: {
      catalogueKpiId: cat13.id,
      employeId: usrEmp1.id,
      assigneParId: usrMgrPme.id,
      kpiServiceId: kpiSrv2.id,
      periodeId: perS1_2025.id,
      cible: 3,
      poids: 25,
      statut: 'VALIDE',
    },
  })

  // ─────────────────────────────────────────
  // 12. KPI PERSONNELS — Karim Tazi (Directeur) / assignés par DG
  // ─────────────────────────────────────────
  await prisma.kpiEmploye.create({
    data: {
      catalogueKpiId: cat6.id,
      employeId: usrDirCom.id,
      assigneParId: usrDg.id,
      kpiServiceId: null,
      periodeId: perS1_2025.id,
      cible: 95,
      poids: 40,
      statut: 'VALIDE',
    },
  })
  await prisma.kpiEmploye.create({
    data: {
      catalogueKpiId: cat7.id,
      employeId: usrDirCom.id,
      assigneParId: usrDg.id,
      kpiServiceId: null,
      periodeId: perS1_2025.id,
      cible: 6,
      poids: 35,
      statut: 'VALIDE',
    },
  })
  await prisma.kpiEmploye.create({
    data: {
      catalogueKpiId: cat15.id,
      employeId: usrDirCom.id,
      assigneParId: usrDg.id,
      kpiServiceId: null,
      periodeId: perS1_2025.id,
      cible: 3,
      poids: 25,
      statut: 'VALIDE',
    },
  })

  // ─────────────────────────────────────────
  // 13. KPI PERSONNELS — Hassan Idrissi (Manager) / assignés par Chef Service
  // ─────────────────────────────────────────
  await prisma.kpiEmploye.create({
    data: {
      catalogueKpiId: cat8.id,
      employeId: usrMgrPme.id,
      assigneParId: usrCsPme.id,
      kpiServiceId: null,
      periodeId: perS1_2025.id,
      cible: 100,
      poids: 40,
      statut: 'VALIDE',
    },
  })
  await prisma.kpiEmploye.create({
    data: {
      catalogueKpiId: cat9.id,
      employeId: usrMgrPme.id,
      assigneParId: usrCsPme.id,
      kpiServiceId: null,
      periodeId: perS1_2025.id,
      cible: 85,
      poids: 35,
      statut: 'VALIDE',
    },
  })
  await prisma.kpiEmploye.create({
    data: {
      catalogueKpiId: cat10.id,
      employeId: usrMgrPme.id,
      assigneParId: usrCsPme.id,
      kpiServiceId: null,
      periodeId: perS1_2025.id,
      cible: 3,
      poids: 25,
      statut: 'VALIDE',
    },
  })

  // ─────────────────────────────────────────
  // 14. SAISIES MENSUELLES — Mehdi Ouali (Janvier et Février 2025, VALIDEE)
  // ─────────────────────────────────────────
  const jan10Date = new Date('2025-02-05')
  const febDate = new Date('2025-03-05')
  await prisma.saisieMensuelle.createMany({
    data: [
      {
        kpiEmployeId: kpiEmp1.id,
        employeId: usrEmp1.id,
        mois: 1,
        annee: 2025,
        valeur_realisee: 13,
        commentaire: '2 dossiers reportés suite audit interne',
        statut: 'VALIDEE',
        valideParId: usrMgrPme.id,
        en_retard: false,
        soumis_le: jan10Date,
        valide_le: jan10Date,
      },
      {
        kpiEmployeId: kpiEmp2.id,
        employeId: usrEmp1.id,
        mois: 1,
        annee: 2025,
        valeur_realisee: 4.2,
        commentaire: '28 enquêtes satisfaction CRM',
        statut: 'VALIDEE',
        valideParId: usrMgrPme.id,
        en_retard: false,
        soumis_le: jan10Date,
        valide_le: jan10Date,
      },
      {
        kpiEmployeId: kpiEmp3.id,
        employeId: usrEmp1.id,
        mois: 1,
        annee: 2025,
        valeur_realisee: 3,
        preuves: 'Certification CRM obtenue',
        statut: 'VALIDEE',
        valideParId: usrMgrPme.id,
        en_retard: false,
        soumis_le: jan10Date,
        valide_le: jan10Date,
      },
      {
        kpiEmployeId: kpiEmp1.id,
        employeId: usrEmp1.id,
        mois: 2,
        annee: 2025,
        valeur_realisee: 15,
        commentaire: 'Objectif atteint',
        statut: 'VALIDEE',
        valideParId: usrMgrPme.id,
        en_retard: false,
        soumis_le: febDate,
        valide_le: febDate,
      },
      {
        kpiEmployeId: kpiEmp2.id,
        employeId: usrEmp1.id,
        mois: 2,
        annee: 2025,
        valeur_realisee: 4.4,
        commentaire: '31 enquêtes satisfaction CRM',
        statut: 'VALIDEE',
        valideParId: usrMgrPme.id,
        en_retard: false,
        soumis_le: febDate,
        valide_le: febDate,
      },
      {
        kpiEmployeId: kpiEmp3.id,
        employeId: usrEmp1.id,
        mois: 2,
        annee: 2025,
        valeur_realisee: 3,
        preuves: "Utilisation quotidienne confirmée manager",
        statut: 'VALIDEE',
        valideParId: usrMgrPme.id,
        en_retard: false,
        soumis_le: febDate,
        valide_le: febDate,
      },
    ],
  })

  // ─────────────────────────────────────────
  // 15. SCORES PÉRIODE — Mehdi Ouali / S1-2025
  // ─────────────────────────────────────────
  // KPI Dossiers (CUMUL): 13+15=28, taux = (28/(15*2))*100 = 93.33
  // KPI Satisfaction (MOYENNE): (4.2+4.4)/2=4.3, taux = (4.3/4.0)*100 = 107.5
  // KPI CRM (DERNIER): 3, taux = (3/4)*100 = 75
  await prisma.scorePeriode.createMany({
    data: [
      { kpiEmployeId: kpiEmp1.id, periodeId: perS1_2025.id, valeur_agregee: 28, taux_atteinte: 93.33, calcule_le: now },
      { kpiEmployeId: kpiEmp2.id, periodeId: perS1_2025.id, valeur_agregee: 4.3, taux_atteinte: 107.5, calcule_le: now },
      { kpiEmployeId: kpiEmp3.id, periodeId: perS1_2025.id, valeur_agregee: 3, taux_atteinte: 75, calcule_le: now },
    ],
  })

  // ─────────────────────────────────────────
  // 16. NOTIFICATIONS de démonstration
  // ─────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        destinataireId: usrEmp1.id,
        type: 'RAPPEL_SAISIE',
        titre: 'Rappel saisie',
        message: "Vous avez jusqu'au 10 avril pour saisir vos KPI de mars 2025",
        lu: false,
      },
      {
        destinataireId: usrEmp1.id,
        type: 'KPI_NOTIFIE',
        titre: 'Nouveaux KPI assignés',
        message: 'Votre manager Hassan Idrissi vous a assigné 3 KPI pour S1-2025',
        lu: false,
      },
      {
        destinataireId: usrEmp1.id,
        type: 'SAISIE_SOUMISE',
        titre: 'Saisie validée',
        message: 'Votre saisie de février 2025 a été validée par Hassan Idrissi',
        lu: true,
      },
      {
        destinataireId: usrMgrPme.id,
        type: 'VALIDATION_REQUISE',
        titre: 'Saisies en attente',
        message: '3 saisies de Mehdi Ouali sont en attente de validation',
        lu: false,
      },
      {
        destinataireId: usrMgrPme.id,
        type: 'SAISIE_SOUMISE',
        titre: 'Nouvelle saisie soumise',
        message: 'Mehdi Ouali a soumis ses réalisations de mars 2025',
        lu: false,
      },
    ],
  })

  console.log('Seed completed successfully.')
}

main()
  .catch((e: { code?: string; message?: string }) => {
    if (e?.code === 'ECONNREFUSED') {
      console.error(
        '\n❌ Connexion à PostgreSQL refusée (ECONNREFUSED).\n' +
          '   → Vérifiez que PostgreSQL est démarré : brew services start postgresql@15\n' +
          '   → Vérifiez DATABASE_URL dans .env.local (ex: postgresql://VOTRE_USER@localhost:5432/kpi_banque)\n' +
          '   → La base kpi_banque doit exister : createdb kpi_banque\n'
      )
    } else {
      console.error(e)
    }
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
