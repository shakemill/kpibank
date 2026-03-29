/**
 * Duplique les KPI (Direction, Service, Employé) de S1-2025 vers S1-2026.
 * À lancer après add-periodes-2026 : pnpm exec tsx prisma/scripts/dupliquer-kpi-2026.ts
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
  const perS1_2025 = await prisma.periode.findFirst({ where: { code: 'S1-2025' } })
  const perS1_2026 = await prisma.periode.findFirst({ where: { code: 'S1-2026' } })
  if (!perS1_2025 || !perS1_2026) {
    throw new Error('S1-2025 ou S1-2026 introuvable. Lancez add-periodes-2026 avant.')
  }

  const kpiDirs = await prisma.kpiDirection.findMany({
    where: { periodeId: perS1_2025.id },
    include: { direction: true, catalogueKpi: true, creePar: { select: { id: true } } },
  })
  const oldToNewKpiDir = new Map<number, number>()
  for (const k of kpiDirs) {
    const created = await prisma.kpiDirection.create({
      data: {
        catalogueKpiId: k.catalogueKpiId,
        directionId: k.directionId,
        periodeId: perS1_2026.id,
        cible: k.cible,
        poids: k.poids,
        description_complementaire: k.description_complementaire,
        statut: 'ACTIF',
        creeParId: k.creeParId,
      },
    })
    oldToNewKpiDir.set(k.id, created.id)
  }
  console.log(`${kpiDirs.length} KPI Direction dupliqués.`)

  const kpiSrvs = await prisma.kpiService.findMany({
    where: { periodeId: perS1_2025.id },
    include: { service: true, catalogueKpi: true, kpiDirection: true, creePar: { select: { id: true } } },
  })
  const oldToNewKpiSrv = new Map<number, number>()
  for (const k of kpiSrvs) {
    const newKpiDirId = k.kpiDirectionId ? oldToNewKpiDir.get(k.kpiDirectionId) ?? null : null
    const created = await prisma.kpiService.create({
      data: {
        catalogueKpiId: k.catalogueKpiId,
        serviceId: k.serviceId,
        periodeId: perS1_2026.id,
        kpiDirectionId: newKpiDirId ?? undefined,
        poids_dans_direction: k.poids_dans_direction,
        cible: k.cible,
        poids: k.poids,
        statut: 'ACTIF',
        creeParId: k.creeParId,
      },
    })
    oldToNewKpiSrv.set(k.id, created.id)
  }
  console.log(`${kpiSrvs.length} KPI Service dupliqués.`)

  const kpiEmps = await prisma.kpiEmploye.findMany({
    where: { periodeId: perS1_2025.id, statut: { in: ['VALIDE', 'CLOTURE'] } },
    include: { employe: true, assignePar: true, kpiService: true, catalogueKpi: true },
  })

  const existingS1_2026 = await prisma.kpiEmploye.findMany({
    where: { periodeId: perS1_2026.id },
    select: { employeId: true, catalogueKpiId: true },
  })
  const existingSet = new Set(existingS1_2026.map((e) => `${e.employeId}-${e.catalogueKpiId}`))

  let created = 0
  for (const k of kpiEmps) {
    const key = `${k.employeId}-${k.catalogueKpiId}`
    if (existingSet.has(key)) continue
    const newKpiSrvId = k.kpiServiceId ? oldToNewKpiSrv.get(k.kpiServiceId) ?? null : null
    await prisma.kpiEmploye.create({
      data: {
        catalogueKpiId: k.catalogueKpiId,
        employeId: k.employeId,
        assigneParId: k.assigneParId,
        kpiServiceId: newKpiSrvId ?? undefined,
        periodeId: perS1_2026.id,
        cible: k.cible,
        poids: k.poids,
        statut: 'VALIDE',
      },
    })
    existingSet.add(key)
    created++
  }
  console.log(`${created} KPI Employé ajoutés (${kpiEmps.length - created} déjà présents).`)

  console.log('Script dupliquer-kpi-2026 terminé avec succès.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
