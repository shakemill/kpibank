/**
 * Met à jour toutes les saisies mensuelles pour que les dates
 * (createdAt, updatedAt, soumis_le, valide_le) soient en février.
 * À lancer : pnpm exec tsx prisma/scripts/saisies-dates-fevrier.ts
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

// Année utilisée pour les dates en février (modifiable)
const ANNEE_FEVRIER = 2025
const DATE_CREATION = new Date(ANNEE_FEVRIER, 1, 15, 10, 0, 0)      // 15 fév 10h
const DATE_MAJ = new Date(ANNEE_FEVRIER, 1, 15, 10, 30, 0)           // 15 fév 10h30
const DATE_SOUMIS = new Date(ANNEE_FEVRIER, 1, 16, 14, 0, 0)         // 16 fév 14h
const DATE_VALIDE = new Date(ANNEE_FEVRIER, 1, 17, 9, 0, 0)         // 17 fév 9h

async function main() {
  const count = await prisma.saisieMensuelle.count()
  console.log(`Saisies mensuelles à mettre à jour : ${count}`)

  // Mise à jour par lots : toutes les saisies ont createdAt/updatedAt en février
  await prisma.saisieMensuelle.updateMany({
    data: {
      createdAt: DATE_CREATION,
      updatedAt: DATE_MAJ,
    },
  })
  console.log('createdAt et updatedAt mis à jour (février).')

  // Pour les saisies soumises : soumis_le en février
  const soumises = await prisma.saisieMensuelle.updateMany({
    where: { soumis_le: { not: null } },
    data: { soumis_le: DATE_SOUMIS },
  })
  console.log(`soumis_le mis à jour pour ${soumises.count} saisie(s).`)

  // Pour les saisies validées : valide_le en février
  const validees = await prisma.saisieMensuelle.updateMany({
    where: { valide_le: { not: null } },
    data: { valide_le: DATE_VALIDE },
  })
  console.log(`valide_le mis à jour pour ${validees.count} saisie(s).`)

  console.log('Terminé : toutes les dates de saisie sont en février.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
