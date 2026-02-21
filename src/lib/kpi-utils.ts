import { prisma } from '@/lib/prisma'

const TOLERANCE = 0.01

/**
 * Somme des poids des KpiDirection ACTIF pour direction/periode (optionnellement en excluant un id).
 * Retourne 100 - somme (poids restant en %).
 */
export async function calculerPoidsRestant(
  directionId: number,
  periodeId: number,
  excludeId?: number
): Promise<number> {
  const where = {
    directionId,
    periodeId,
    statut: 'ACTIF' as const,
    ...(excludeId != null && { id: { not: excludeId } }),
  }
  const result = await prisma.kpiDirection.aggregate({
    where,
    _sum: { poids: true },
  })
  const sum = result._sum.poids ?? 0
  return Math.max(0, 100 - sum)
}

/**
 * Vérifie que la somme des poids des KPI direction ACTIF pour direction/periode = 100%.
 */
export async function validerSommePoidsDirection(
  directionId: number,
  periodeId: number
): Promise<boolean> {
  const result = await prisma.kpiDirection.aggregate({
    where: { directionId, periodeId, statut: 'ACTIF' },
    _sum: { poids: true },
  })
  const sum = result._sum.poids ?? 0
  return Math.abs(sum - 100) < TOLERANCE
}

/**
 * Somme des poids des KpiService ACTIF pour service/periode (optionnellement en excluant un id).
 * Retourne 100 - somme (poids restant en %).
 */
export async function calculerPoidsRestantService(
  serviceId: number,
  periodeId: number,
  excludeId?: number
): Promise<number> {
  const where = {
    serviceId,
    periodeId,
    statut: 'ACTIF' as const,
    ...(excludeId != null && { id: { not: excludeId } }),
  }
  const result = await prisma.kpiService.aggregate({
    where,
    _sum: { poids: true },
  })
  const sum = result._sum.poids ?? 0
  return Math.max(0, 100 - sum)
}

/**
 * Somme des poids_dans_direction des KpiService pour un kpiDirectionId (optionnellement en excluant un KpiService).
 * Retourne 100 - somme. Utilisé pour alerte si somme > 100%.
 */
export async function calculerPoidsDansDirectionRestant(
  kpiDirectionId: number,
  excludeKpiServiceId?: number
): Promise<number> {
  const where = {
    kpiDirectionId,
    ...(excludeKpiServiceId != null && { id: { not: excludeKpiServiceId } }),
  }
  const result = await prisma.kpiService.aggregate({
    where,
    _sum: { poids_dans_direction: true },
  })
  const sum = result._sum.poids_dans_direction ?? 0
  return Math.max(0, 100 - sum)
}

/**
 * Vérifie que la somme des poids_dans_direction pour ce kpiDirectionId ≤ 100 (avec tolérance).
 */
export async function validerSommePoidsDansDirection(kpiDirectionId: number): Promise<boolean> {
  const result = await prisma.kpiService.aggregate({
    where: { kpiDirectionId },
    _sum: { poids_dans_direction: true },
  })
  const sum = result._sum.poids_dans_direction ?? 0
  return sum <= 100 + TOLERANCE
}

/**
 * Vérifie que la somme des poids des KPI service ACTIF pour service/periode = 100%.
 */
export async function validerSommePoidsService(
  serviceId: number,
  periodeId: number
): Promise<boolean> {
  const result = await prisma.kpiService.aggregate({
    where: { serviceId, periodeId, statut: 'ACTIF' },
    _sum: { poids: true },
  })
  const sum = result._sum.poids ?? 0
  return Math.abs(sum - 100) < TOLERANCE
}

/**
 * Somme des poids des KpiEmploye pour employé/période (tous statuts sauf CLOTURE, ou tous).
 * Retourne 100 - somme (poids restant pour assignation).
 */
export async function calculerPoidsRestantEmploye(
  employeId: number,
  periodeId: number,
  excludeId?: number
): Promise<number> {
  const where = {
    employeId,
    periodeId,
    ...(excludeId != null && { id: { not: excludeId } }),
  }
  const result = await prisma.kpiEmploye.aggregate({
    where,
    _sum: { poids: true },
  })
  const sum = result._sum.poids ?? 0
  return Math.max(0, 100 - sum)
}

/**
 * Vérifie que la somme des poids des KPI employé (statut VALIDE) pour employé/période = 100%.
 */
export async function validerSommePoidsEmploye(
  userId: number,
  periodeId: number
): Promise<boolean> {
  const result = await prisma.kpiEmploye.aggregate({
    where: { employeId: userId, periodeId, statut: 'VALIDE' },
    _sum: { poids: true },
  })
  const sum = result._sum.poids ?? 0
  return Math.abs(sum - 100) < TOLERANCE
}
