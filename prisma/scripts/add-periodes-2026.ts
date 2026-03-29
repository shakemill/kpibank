/**
 * Clôture les périodes 2025 et crée S1-2026 et T1-2026.
 * À lancer sans reset : pnpm exec tsx prisma/scripts/add-periodes-2026.ts
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

function dateLimiteSaisie(annee: number, moisFin: number): Date {
  const moisSuivant = moisFin === 12 ? 1 : moisFin + 1
  const anneeSuivante = moisFin === 12 ? annee + 1 : annee
  return new Date(anneeSuivante, moisSuivant - 1, 10)
}

async function main() {
  await prisma.periode.updateMany({
    where: { annee: 2025 },
    data: { statut: 'CLOTUREE', actif: false },
  })
  console.log('Périodes 2025 clôturées.')

  const existingS1 = await prisma.periode.findFirst({ where: { code: 'S1-2026' } })
  if (!existingS1) {
    await prisma.periode.create({
      data: {
        type: 'SEMESTRIEL',
        code: 'S1-2026',
        mois_debut: 1,
        mois_fin: 6,
        annee: 2026,
        date_debut: new Date('2026-01-01'),
        date_fin: new Date('2026-06-30'),
        date_limite_saisie: dateLimiteSaisie(2026, 6),
        statut: 'EN_COURS',
        actif: true,
      },
    })
    console.log('S1-2026 créée.')
  } else {
    await prisma.periode.update({
      where: { id: existingS1.id },
      data: { statut: 'EN_COURS', actif: true },
    })
    console.log('S1-2026 déjà présente, statut mis à jour.')
  }

  const existingT1 = await prisma.periode.findFirst({ where: { code: 'T1-2026' } })
  if (!existingT1) {
    await prisma.periode.create({
      data: {
        type: 'TRIMESTRIEL',
        code: 'T1-2026',
        mois_debut: 1,
        mois_fin: 3,
        annee: 2026,
        date_debut: new Date('2026-01-01'),
        date_fin: new Date('2026-03-31'),
        date_limite_saisie: dateLimiteSaisie(2026, 3),
        statut: 'EN_COURS',
        actif: true,
      },
    })
    console.log('T1-2026 créée.')
  } else {
    await prisma.periode.update({
      where: { id: existingT1.id },
      data: { statut: 'EN_COURS', actif: true },
    })
    console.log('T1-2026 déjà présente, statut mis à jour.')
  }

  console.log('Script add-periodes-2026 terminé avec succès.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
