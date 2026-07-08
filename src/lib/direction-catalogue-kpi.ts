import { prisma } from '@/lib/prisma'

const catalogueKpiSelect = {
  id: true,
  code: true,
  nom: true,
  description: true,
  type: true,
  frequence: true,
  unite: true,
  categorie: true,
  actif: true,
  portee: true,
} as const

export async function canRemoveDirectionCatalogueKpi(
  directionId: number,
  catalogueKpiId: number
): Promise<{ allowed: boolean; reason?: string }> {
  const catalogue = await prisma.catalogueKpi.findUnique({
    where: { id: catalogueKpiId },
    select: { portee: true },
  })

  if (catalogue?.portee === 'SERVICE') {
    const blockingSvc = await prisma.kpiService.findFirst({
      where: {
        catalogueKpiId,
        statut: 'ACTIF',
        periode: { statut: 'EN_COURS' },
        service: { directionId },
      },
      select: {
        id: true,
        service: { select: { nom: true } },
        periode: { select: { code: true } },
      },
    })
    if (blockingSvc) {
      return {
        allowed: false,
        reason: `Ce KPI est actif pour ${blockingSvc.service.nom} (${blockingSvc.periode.code}). Retirez-le d'abord des KPI service.`,
      }
    }
    return { allowed: true }
  }

  const blocking = await prisma.kpiDirection.findFirst({
    where: {
      directionId,
      catalogueKpiId,
      statut: 'ACTIF',
      periode: { statut: 'EN_COURS' },
    },
    select: {
      id: true,
      periode: { select: { code: true } },
    },
  })

  if (blocking) {
    return {
      allowed: false,
      reason: `Ce KPI est actif pour la période en cours (${blocking.periode.code}). Retirez-le d'abord des KPI direction de la période.`,
    }
  }

  return { allowed: true }
}

export async function listDirectionCatalogueKpis(directionId: number) {
  const rows = await prisma.directionCatalogueKpi.findMany({
    where: { directionId },
    include: { catalogueKpi: { select: catalogueKpiSelect } },
    orderBy: { catalogueKpi: { nom: 'asc' } },
  })

  const withRemovable = await Promise.all(
    rows.map(async (row) => {
      const check = await canRemoveDirectionCatalogueKpi(directionId, row.catalogueKpiId)
      return {
        id: row.id,
        catalogueKpiId: row.catalogueKpiId,
        createdAt: row.createdAt,
        catalogueKpi: row.catalogueKpi,
        canRemove: check.allowed,
        removeBlockedReason: check.reason ?? null,
      }
    })
  )

  return withRemovable
}

export { catalogueKpiSelect }
