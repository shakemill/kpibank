/**
 * Supprime toutes les périodes puis tous les KPI du catalogue.
 * La suppression des périodes entraîne en cascade la suppression des KpiDirection,
 * KpiService, KpiEmploye, ScorePeriode, ConsolidationService, ConsolidationDirection
 * et des SaisieMensuelle liées.
 * À lancer : pnpm run supprimer-kpi-et-periodes
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
  const deletedPeriodes = await prisma.periode.deleteMany({})
  console.log(`${deletedPeriodes.count} période(s) supprimée(s).`)

  const deletedCatalogue = await prisma.catalogueKpi.deleteMany({})
  console.log(`${deletedCatalogue.count} KPI catalogue supprimé(s).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
