/**
 * Supprime tous les services puis toutes les directions.
 * Les suppressions en cascade (KPI, consolidations, etc.) sont gérées par le schéma.
 * À lancer : pnpm run supprimer-services-et-directions
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
  const deletedServices = await prisma.service.deleteMany({})
  console.log(`${deletedServices.count} service(s) supprimé(s).`)

  const deletedDirections = await prisma.direction.deleteMany({})
  console.log(`${deletedDirections.count} direction(s) supprimée(s).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
