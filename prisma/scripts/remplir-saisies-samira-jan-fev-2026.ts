/**
 * Remplit les saisies de Samira Ebongue pour janvier 2026 et février 2026.
 * À lancer : pnpm exec tsx prisma/scripts/remplir-saisies-samira-jan-fev-2026.ts
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
  const user = await prisma.user.findFirst({
    where: { nom: 'Ebongue', prenom: 'Samira' },
    select: { id: true, nom: true, prenom: true },
  })
  if (!user) {
    console.log('Utilisateur Samira Ebongue introuvable.')
    process.exit(1)
  }
  console.log(`Utilisateur trouvé : ${user.prenom} ${user.nom} (id=${user.id})`)

  const periode = await prisma.periode.findFirst({
    where: {
      annee: 2026,
      mois_debut: { lte: 2 },
      mois_fin: { gte: 1 },
      actif: true,
    },
    select: { id: true, code: true, mois_debut: true, mois_fin: true, annee: true },
  })
  if (!periode) {
    console.log('Aucune période trouvée pour jan-fév 2026 (ex. T1-2026).')
    process.exit(1)
  }
  console.log(`Période : ${periode.code} (id=${periode.id})`)

  const kpiEmployes = await prisma.kpiEmploye.findMany({
    where: {
      employeId: user.id,
      periodeId: periode.id,
      statut: { in: ['VALIDE', 'CLOTURE'] },
    },
    select: {
      id: true,
      cible: true,
      catalogueKpi: { select: { nom: true, type: true } },
    },
  })
  if (kpiEmployes.length === 0) {
    console.log('Aucun KPI assigné à Samira Ebongue pour cette période.')
    process.exit(0)
  }
  console.log(`${kpiEmployes.length} KPI trouvé(s).`)

  const now = new Date()
  const soumisLe = new Date(2026, 1, 10, 14, 0, 0)
  const valideLe = new Date(2026, 1, 12, 9, 0, 0)

  for (const ke of kpiEmployes) {
    for (const { mois, annee } of [
      { mois: 1, annee: 2026 },
      { mois: 2, annee: 2026 },
    ]) {
      if (mois < periode.mois_debut || mois > periode.mois_fin || annee !== periode.annee) continue
      const type = ke.catalogueKpi?.type ?? 'QUANTITATIF'
      let valeur: number
      if (type === 'COMPORTEMENTAL') {
        valeur = Math.min(4, Math.max(1, Math.round(ke.cible)))
      } else {
        valeur = Math.round(ke.cible * 1.02 * 100) / 100
      }
      await prisma.saisieMensuelle.upsert({
        where: {
          kpiEmployeId_mois_annee: {
            kpiEmployeId: ke.id,
            mois,
            annee,
          },
        },
        create: {
          kpiEmployeId: ke.id,
          employeId: user.id,
          mois,
          annee,
          valeur_realisee: valeur,
          statut: 'VALIDEE',
          en_retard: false,
          soumis_le: soumisLe,
          valide_le: valideLe,
        },
        update: {
          valeur_realisee: valeur,
          statut: 'VALIDEE',
          en_retard: false,
          soumis_le: soumisLe,
          valide_le: valideLe,
        },
      })
      console.log(`  ${ke.catalogueKpi?.nom} — ${mois}/${annee} : ${valeur} (${type})`)
    }
  }

  console.log('Saisies janvier et février 2026 créées ou mises à jour pour Samira Ebongue.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
