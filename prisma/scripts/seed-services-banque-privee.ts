/**
 * Ajoute les services Emeraude et Topaze sous Direction de la Banque Privée.
 * À lancer : pnpm run seed:services-banque-privee
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const DIRECTION_CODE = 'DIR_BANQUE_PRIVEE'

const SERVICES = [
  { nom: 'Emeraude', code: 'SRV_EMERAUDE' },
  { nom: 'Topaze', code: 'SRV_TOPAZE' },
] as const

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
  for (const svc of SERVICES) {
    const existing = await prisma.service.findFirst({
      where: { code: svc.code, directionId: direction.id },
    })
    if (existing) {
      console.log(`Ignoré (déjà présent) : ${svc.nom} (${svc.code})`)
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

  console.log(`\nTerminé : ${created} service(s) créé(s).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
