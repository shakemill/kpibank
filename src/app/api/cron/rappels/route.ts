import { prisma } from '@/lib/prisma'
import {
  notifierRappelSaisie,
  notifierManagerSaisiesManquantes,
} from '@/lib/notifications'
import { apiSuccess, apiError } from '@/lib/api-response'

function checkCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get('x-cron-secret') ?? request.headers.get('authorization')
  if (header?.startsWith('Bearer ')) return header.slice(7) === secret
  return header === secret
}

/**
 * Pour un mois de saisie (mois, annee en 1-12), la date limite est le delaiJour du mois suivant.
 * Retourne (mois, annee) du mois de saisie dont la date limite est la date donnée.
 */
function getSaisieMonthForLimitDate(limitDate: Date): { mois: number; annee: number } | null {
  const d = limitDate.getDate()
  const m = limitDate.getMonth()
  const y = limitDate.getFullYear()
  if (m === 0) {
    return { mois: 12, annee: y - 1 }
  }
  return { mois: m, annee: y }
}

/**
 * Date limite pour le mois de saisie (mois 1-12, annee).
 */
function getLimitDateForSaisieMonth(mois: number, annee: number, delaiJour: number): Date {
  if (mois === 12) {
    return new Date(annee + 1, 0, delaiJour)
  }
  return new Date(annee, mois, delaiJour)
}

export async function GET(request: Request) {
  if (!checkCronSecret(request)) return apiError('Unauthorized', 401)

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const delaiParam = await prisma.parametre.findUnique({
    where: { cle: 'DELAI_SAISIE_JOUR' },
    select: { valeur: true },
  })
  const delaiJour = delaiParam ? parseInt(delaiParam.valeur, 10) : 10
  const delai = Number.isNaN(delaiJour) ? 10 : delaiJour

  let action: string | null = null
  let notificationsSent = 0
  let manquantesCreated = 0

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const jMinus3 = new Date(today)
  jMinus3.setDate(jMinus3.getDate() + 3)
  const jMinus1 = new Date(today)
  jMinus1.setDate(jMinus1.getDate() + 1)
  const jPlus1 = new Date(today)
  jPlus1.setDate(jPlus1.getDate() - 1)

  const saisieJ3 = getSaisieMonthForLimitDate(jMinus3)
  const saisieJ1 = getSaisieMonthForLimitDate(jMinus1)
  const saisieJPlus1 = getSaisieMonthForLimitDate(jPlus1)

  if (saisieJ3) {
    const limitDate = getLimitDateForSaisieMonth(saisieJ3.mois, saisieJ3.annee, delai)
    limitDate.setHours(0, 0, 0, 0)
    if (limitDate.getTime() === jMinus3.getTime()) {
      action = 'j-3'
      notificationsSent = await notifierRappelSaisie(saisieJ3.mois, saisieJ3.annee)
      console.log(`[cron/rappels] ${now.toISOString()} J-3 rappels: mois=${saisieJ3.mois} annee=${saisieJ3.annee} notifications=${notificationsSent}`)
    }
  }

  if (!action && saisieJ1) {
    const limitDate = getLimitDateForSaisieMonth(saisieJ1.mois, saisieJ1.annee, delai)
    limitDate.setHours(0, 0, 0, 0)
    if (limitDate.getTime() === jMinus1.getTime()) {
      action = 'j-1'
      notificationsSent = await notifierRappelSaisie(saisieJ1.mois, saisieJ1.annee)
      console.log(`[cron/rappels] ${now.toISOString()} J-1 rappels: mois=${saisieJ1.mois} annee=${saisieJ1.annee} notifications=${notificationsSent}`)
    }
  }

  if (!action && saisieJPlus1) {
    const limitDate = getLimitDateForSaisieMonth(saisieJPlus1.mois, saisieJPlus1.annee, delai)
    limitDate.setHours(0, 0, 0, 0)
    if (limitDate.getTime() === jPlus1.getTime()) {
      action = 'j+1'
      const { mois, annee } = saisieJPlus1

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
      if (periodeId) {
        const kpiEmployes = await prisma.kpiEmploye.findMany({
          where: {
            periodeId,
            statut: { in: ['VALIDE', 'CLOTURE'] },
          },
          select: { id: true, employeId: true },
        })
        const existingSaisies = await prisma.saisieMensuelle.findMany({
          where: {
            kpiEmployeId: { in: kpiEmployes.map((k) => k.id) },
            mois,
            annee,
          },
          select: { kpiEmployeId: true },
        })
        const existingKeys = new Set(existingSaisies.map((s) => s.kpiEmployeId))
        const toCreate = kpiEmployes.filter((k) => !existingKeys.has(k.id))
        for (const k of toCreate) {
          await prisma.saisieMensuelle.create({
            data: {
              kpiEmployeId: k.id,
              employeId: k.employeId,
              mois,
              annee,
              statut: 'MANQUANTE',
            },
          })
          manquantesCreated++
        }

        const employeIdsManquants = [...new Set(toCreate.map((k) => k.employeId))]
        const employesWithManager = await prisma.user.findMany({
          where: { id: { in: employeIdsManquants } },
          select: { managerId: true },
        })
        const managerToCount = new Map<number, number>()
        for (const e of employesWithManager) {
          if (e.managerId != null) {
            managerToCount.set(e.managerId, (managerToCount.get(e.managerId) ?? 0) + 1)
          }
        }
        for (const [managerId, count] of managerToCount) {
          await notifierManagerSaisiesManquantes(managerId, mois, annee, count)
          notificationsSent++
        }
      }
      console.log(`[cron/rappels] ${now.toISOString()} J+1: mois=${mois} annee=${annee} manquantesCreated=${manquantesCreated} notificationsManagers=${notificationsSent}`)
    }
  }

  if (!action) {
    console.log(`[cron/rappels] ${now.toISOString()} no action (today is not J-3, J-1 or J+1 for any saisie month)`)
  }

  return apiSuccess({
    ok: true,
    action: action ?? 'none',
    notificationsSent,
    manquantesCreated,
  })
}
