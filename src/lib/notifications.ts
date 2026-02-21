import type { TypeNotification } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mailer'
import { getEtablissementNom } from '@/lib/etablissement'
import {
  templateRappelSaisie,
  templateKpiNotifie,
  templateSaisieValidee,
  templateKpiConteste,
  templateSaisieEnRetard,
} from '@/lib/email-templates'

/**
 * Crée une notification pour un utilisateur.
 */
export async function createNotification(
  userId: number,
  type: TypeNotification,
  titre: string,
  message: string,
  lien?: string
): Promise<{ id: number }> {
  const n = await prisma.notification.create({
    data: {
      destinataireId: userId,
      type,
      titre,
      message,
      lien: lien ?? null,
    },
    select: { id: true },
  })
  return n
}

const ASSIGNATEUR_ROLE_LABEL: Record<string, string> = {
  DG: 'DG',
  DIRECTEUR: 'Directeur',
  CHEF_SERVICE: 'Chef de service',
  MANAGER: 'Manager',
}

/**
 * Notifie un utilisateur qu'un KPI lui a été assigné (DG → Directeur, Chef de service → Manager, etc.).
 */
export async function notifierKpiAssigne(
  destinataireId: number,
  assignateurNom: string,
  assignateurRole: string,
  kpiNom: string,
  periodeCode: string
): Promise<number> {
  const roleLabel = ASSIGNATEUR_ROLE_LABEL[assignateurRole] ?? assignateurRole
  const prefix = assignateurRole === 'DG' ? 'Le DG' : `Le ${roleLabel}`
  const titre = 'KPI assigné'
  const message = `${prefix} ${assignateurNom} vous a assigné le KPI « ${kpiNom} » pour la période ${periodeCode}.`
  const lien = '/employe/mes-kpi'
  await createNotification(destinataireId, 'KPI_NOTIFIE', titre, message, lien)
  try {
    const [user, nomEtablissement] = await Promise.all([
      prisma.user.findUnique({
        where: { id: destinataireId },
        select: { email: true, prenom: true },
      }),
      getEtablissementNom(),
    ])
    if (user?.email) {
      await sendMail({
        to: user.email,
        subject: titre,
        html: templateKpiNotifie(nomEtablissement, user.prenom ?? 'Collaborateur', assignateurNom, periodeCode, 1),
      })
    }
  } catch (_e) {
    // Ne pas bloquer le flux
  }
  return 1
}

/**
 * Récupère les utilisateurs sans saisie soumise (SOUMISE, VALIDEE, AJUSTEE) pour un mois donné.
 * Cible tout utilisateur ayant au moins un KpiEmploye VALIDE/CLOTURE sur une période couvrant (mois, annee),
 * y compris les DIRECTEURS et MANAGERS avec KPI personnels.
 */
async function getEmployesSansSaisieSoumise(mois: number, annee: number): Promise<number[]> {
  const periodes = await prisma.periode.findMany({
    where: {
      actif: true,
      mois_debut: { lte: mois },
      mois_fin: { gte: mois },
      annee,
    },
    select: { id: true },
    take: 1,
  })
  const periodeId = periodes[0]?.id
  if (!periodeId) return []

  const kpiEmployes = await prisma.kpiEmploye.findMany({
    where: {
      periodeId,
      statut: { in: ['VALIDE', 'CLOTURE'] },
    },
    select: { employeId: true },
  })
  const employeIdsAvecKpi = [...new Set(kpiEmployes.map((k) => k.employeId))]
  if (employeIdsAvecKpi.length === 0) return []

  const avecSaisieSoumise = await prisma.saisieMensuelle.findMany({
    where: {
      employeId: { in: employeIdsAvecKpi },
      mois,
      annee,
      statut: { in: ['SOUMISE', 'VALIDEE', 'AJUSTEE'] },
    },
    select: { employeId: true },
  })
  const idsAvecSaisie = new Set(avecSaisieSoumise.map((s) => s.employeId))
  return employeIdsAvecKpi.filter((id) => !idsAvecSaisie.has(id))
}

/**
 * Rappel de saisie : notifie tous les utilisateurs ayant des KPI personnels (VALIDE) sans saisie soumise pour le mois.
 * Inclut les EMPLOYE, MANAGERS et DIRECTEURS avec au moins un KpiEmploye VALIDE sur la période.
 */
export async function notifierRappelSaisie(mois: number, annee: number): Promise<number> {
  const userIds = await getEmployesSansSaisieSoumise(mois, annee)
  const titre = 'Rappel de saisie'
  const message = `Vous n'avez pas encore soumis votre saisie pour ${mois}/${annee}. Pensez à la compléter avant la date limite.`
  const lien = '/saisie'
  const periodes = await prisma.periode.findMany({
    where: { actif: true, mois_debut: { lte: mois }, mois_fin: { gte: mois }, annee },
    select: { date_limite_saisie: true },
    take: 1,
  })
  const dateLimiteStr = periodes[0]?.date_limite_saisie
    ? periodes[0].date_limite_saisie.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : `${mois}/${annee}`
  const moisLabel = new Date(annee, mois - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const nomEtablissement = await getEtablissementNom()
  let count = 0
  for (const userId of userIds) {
    await createNotification(userId, 'RAPPEL_SAISIE', titre, message, lien)
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, prenom: true },
      })
      if (user?.email) {
        await sendMail({
          to: user.email,
          subject: titre,
          html: templateRappelSaisie(nomEtablissement, user.prenom ?? 'Collaborateur', moisLabel, dateLimiteStr),
        })
      }
    } catch (_e) {
      // Ne pas bloquer
    }
    count++
  }
  return count
}

/**
 * Saisie en retard : notifie les employés sans saisie soumise après le délai.
 */
export async function notifierSaisieEnRetard(mois: number, annee: number): Promise<number> {
  const userIds = await getEmployesSansSaisieSoumise(mois, annee)
  const titre = 'Saisie en retard'
  const message = `La date limite de saisie pour ${mois}/${annee} est dépassée. Merci de soumettre votre saisie au plus vite.`
  const lien = '/saisie'
  const moisLabel = new Date(annee, mois - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const nomEtablissement = await getEtablissementNom()
  let count = 0
  for (const userId of userIds) {
    await createNotification(userId, 'SAISIE_EN_RETARD', titre, message, lien)
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, prenom: true, managerId: true },
      })
      if (user?.email) {
        let managerNom = 'Votre manager'
        if (user.managerId) {
          const manager = await prisma.user.findUnique({
            where: { id: user.managerId },
            select: { prenom: true, nom: true },
          })
          if (manager) managerNom = `${manager.prenom} ${manager.nom}`
        }
        await sendMail({
          to: user.email,
          subject: titre,
          html: templateSaisieEnRetard(nomEtablissement, user.prenom ?? 'Collaborateur', moisLabel, managerNom),
        })
      }
    } catch (_e) {
      // Ne pas bloquer
    }
    count++
  }
  return count
}

/**
 * Notifie le manager qu'il a de nouvelles saisies à valider.
 */
export async function notifierManagerNouvellesSaisies(managerId: number): Promise<number> {
  const titre = 'Nouvelles saisies à valider'
  const message = 'Des collaborateurs ont soumis des saisies en attente de validation.'
  const lien = '/manager/validation'
  await createNotification(managerId, 'VALIDATION_REQUISE', titre, message, lien)
  return 1
}

/**
 * Notifie le manager d'une contestation KPI reçue.
 */
export async function notifierKpiConteste(managerId: number, kpiEmployeId: number): Promise<number> {
  const titre = 'Contestation KPI'
  const message = 'Un collaborateur a contesté un KPI. Une réponse de votre part est attendue.'
  const lien = `/manager/assignation?contestation=${kpiEmployeId}`
  await createNotification(managerId, 'KPI_CONTESTE', titre, message, lien)
  try {
    const ke = await prisma.kpiEmploye.findUnique({
      where: { id: kpiEmployeId },
      include: {
        employe: { select: { prenom: true } },
        catalogueKpi: { select: { nom: true } },
      },
    })
    const [manager, nomEtablissement] = await Promise.all([
      prisma.user.findUnique({
        where: { id: managerId },
        select: { email: true, prenom: true },
      }),
      getEtablissementNom(),
    ])
    if (manager?.email && ke) {
      await sendMail({
        to: manager.email,
        subject: titre,
        html: templateKpiConteste(
          nomEtablissement,
          manager.prenom ?? 'Manager',
          ke.employe.prenom ?? 'Collaborateur',
          ke.catalogueKpi.nom,
          ke.motif_contestation ?? 'Non précisé'
        ),
      })
    }
  } catch (_e) {
    // Ne pas bloquer
  }
  return 1
}

/**
 * Notifie l'employé que sa saisie a été validée par son manager (+ envoi email).
 */
export async function notifierSaisieValidee(
  employeId: number,
  mois: number,
  annee: number,
  score: number = 0
): Promise<number> {
  const moisLabel = new Date(annee, mois - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const titre = 'Saisie validée'
  const message = `Votre saisie pour ${mois}/${annee} a été validée par votre manager.`
  const lien = '/saisie'
  await createNotification(employeId, 'SAISIE_SOUMISE', titre, message, lien)
  try {
    const [user, nomEtablissement] = await Promise.all([
      prisma.user.findUnique({
        where: { id: employeId },
        select: { email: true, prenom: true },
      }),
      getEtablissementNom(),
    ])
    if (user?.email) {
      await sendMail({
        to: user.email,
        subject: titre,
        html: templateSaisieValidee(nomEtablissement, user.prenom ?? 'Collaborateur', moisLabel, score),
      })
    }
  } catch (_e) {
    // Ne pas bloquer
  }
  return 1
}

/**
 * Notifie un manager que des saisies sont manquantes pour son équipe (après date limite).
 */
export async function notifierManagerSaisiesManquantes(
  managerId: number,
  mois: number,
  annee: number,
  count: number
): Promise<number> {
  const titre = 'Saisies manquantes'
  const message = `${count} collaborateur(s) n'ont pas soumis leur saisie pour ${mois}/${annee}. Les saisies ont été marquées comme manquantes.`
  const lien = '/manager/validation'
  await createNotification(managerId, 'SAISIE_EN_RETARD', titre, message, lien)
  return 1
}

/**
 * Notifie l'employé de la réponse à sa contestation (MAINTENU ou REVISE).
 */
export async function notifierEmployeReponseContestation(
  userId: number,
  kpiEmployeId: number,
  decision: 'MAINTENU' | 'REVISE'
): Promise<number> {
  const type: TypeNotification = decision === 'MAINTENU' ? 'KPI_MAINTENU' : 'KPI_REVISE'
  const titre = decision === 'MAINTENU' ? 'Contestation maintenue' : 'Contestation révisée'
  const message =
    decision === 'MAINTENU'
      ? 'Votre manager a maintenu le KPI tel quel après examen de votre contestation.'
      : 'Votre manager a révisé le KPI suite à votre contestation.'
  const lien = '/employe/mes-kpi'
  await createNotification(userId, type, titre, message, lien)
  return 1
}
