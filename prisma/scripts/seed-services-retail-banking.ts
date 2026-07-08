/**
 * Ajoute les services (pierres / gemmes) sous Direction du Retail Banking.
 * À lancer : pnpm run seed:services-retail-banking
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const DIRECTION_CODE = 'DIR_RETAIL'

const SERVICES: Array<{ nom: string; code: string }> = [
  { nom: 'Amazonite', code: 'SRV_AMAZONITE' },
  { nom: 'Ambre', code: 'SRV_AMBRE' },
  { nom: 'Améthyste', code: 'SRV_AMETHYSTE' },
  { nom: 'Béryl', code: 'SRV_BERYL' },
  { nom: 'Calcite', code: 'SRV_CALCITE' },
  { nom: 'Citrine', code: 'SRV_CITRINE' },
  { nom: 'Cornaline', code: 'SRV_CORNALINE' },
  { nom: 'Cristal', code: 'SRV_CRISTAL' },
  { nom: 'Diamant', code: 'SRV_DIAMANT' },
  { nom: 'Grenat', code: 'SRV_GRENAT' },
  { nom: 'Héliolite', code: 'SRV_HELIOLITE' },
  { nom: 'Hématite', code: 'SRV_HEMATITE' },
  { nom: 'Iris', code: 'SRV_IRIS' },
  { nom: 'Jade', code: 'SRV_JADE' },
  { nom: 'Jaspe', code: 'SRV_JASPE' },
  { nom: 'Malachite', code: 'SRV_MALACHITE' },
  { nom: 'Nacre', code: 'SRV_NACRE' },
  { nom: 'Onyx', code: 'SRV_ONYX' },
  { nom: 'Opale', code: 'SRV_OPALE' },
  { nom: 'Perle', code: 'SRV_PERLE' },
  { nom: 'Quartz', code: 'SRV_QUARTZ' },
  { nom: 'Retail business center', code: 'SRV_RETAIL_BUSINESS_CENTER' },
  { nom: 'Rubis', code: 'SRV_RUBIS' },
  { nom: 'Saphir', code: 'SRV_SAPHIR' },
  { nom: 'Spinelle', code: 'SRV_SPINELLE' },
  { nom: 'Tanzanite', code: 'SRV_TANZANITE' },
  { nom: 'Turquoise', code: 'SRV_TURQUOISE' },
  { nom: 'Zircon', code: 'SRV_ZIRCON' },
]

async function main() {
  const direction = await prisma.direction.findFirst({
    where: { code: DIRECTION_CODE },
    select: { id: true, nom: true },
  })
  if (!direction) {
    throw new Error(
      `Direction introuvable (code ${DIRECTION_CODE}). Lancez d'abord : pnpm run seed:directions-bgfi`
    )
  }

  console.log(`Direction : ${direction.nom}`)

  let created = 0
  let skipped = 0
  for (const svc of SERVICES) {
    const existing = await prisma.service.findFirst({
      where: { code: svc.code, directionId: direction.id },
    })
    if (existing) {
      console.log(`Ignoré : ${svc.nom} (${svc.code})`)
      skipped++
      continue
    }
    await prisma.service.create({
      data: {
        nom: svc.nom,
        code: svc.code,
        directionId: direction.id,
        actif: true,
      },
    })
    console.log(`Créé : ${svc.nom} (${svc.code})`)
    created++
  }

  console.log(`\nTerminé : ${created} créé(s), ${skipped} ignoré(s).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
