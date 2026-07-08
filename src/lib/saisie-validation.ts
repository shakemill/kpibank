import { prisma } from '@/lib/prisma'
import { consolidateEmploye } from '@/lib/consolidation'
import { notifierSaisieValidee } from '@/lib/notifications'

type EmployeMoisAnnee = { employeId: number; mois: number; annee: number }

function groupKey(employeId: number, mois: number, annee: number): string {
  return `${employeId}-${mois}-${annee}`
}

function uniqueEmployeMoisAnnees(rows: EmployeMoisAnnee[]): EmployeMoisAnnee[] {
  const map = new Map<string, EmployeMoisAnnee>()
  for (const row of rows) {
    map.set(groupKey(row.employeId, row.mois, row.annee), row)
  }
  return [...map.values()]
}

/**
 * Consolidation + notification employé uniquement quand toutes les saisies du mois sont validées.
 */
export async function finaliserValidationEmployeMois(
  employeId: number,
  mois: number,
  annee: number
): Promise<void> {
  const remaining = await prisma.saisieMensuelle.count({
    where: { employeId, mois, annee, statut: 'SOUMISE' },
  })
  if (remaining > 0) return

  let score = 0
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
  if (periodes[0]) {
    try {
      const res = await consolidateEmploye(employeId, periodes[0].id)
      score = res.scoreGlobal
    } catch {
      // Garder score à 0
    }
  }

  try {
    await notifierSaisieValidee(employeId, mois, annee, score)
  } catch {
    // Ne pas bloquer la validation
  }
}

export async function finaliserValidationsEmployesMois(
  groupes: EmployeMoisAnnee[]
): Promise<void> {
  await Promise.all(
    uniqueEmployeMoisAnnees(groupes).map((g) =>
      finaliserValidationEmployeMois(g.employeId, g.mois, g.annee)
    )
  )
}

export async function validerSaisiesByIds(
  ids: number[],
  valideParId: number
): Promise<{ count: number; ids: number[] }> {
  if (ids.length === 0) return { count: 0, ids: [] }

  const saisies = await prisma.saisieMensuelle.findMany({
    where: { id: { in: ids }, statut: 'SOUMISE' },
    select: { id: true, employeId: true, mois: true, annee: true },
  })
  if (saisies.length === 0) return { count: 0, ids: [] }

  const now = new Date()
  await prisma.saisieMensuelle.updateMany({
    where: { id: { in: saisies.map((s) => s.id) } },
    data: {
      statut: 'VALIDEE',
      valideParId,
      valide_le: now,
    },
  })

  await finaliserValidationsEmployesMois(saisies)

  return { count: saisies.length, ids: saisies.map((s) => s.id) }
}
