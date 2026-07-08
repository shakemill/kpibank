/**
 * Saisies avril & mai 2026 pour manager@yarabyte.com (Christiane Nejou Kampé)
 * — taux d'atteinte > 90 % sur chaque KPI.
 *
 * pnpm exec tsx prisma/scripts/remplir-saisies-manager-yarabyte-avr-mai-2026.ts
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const EMAIL = 'manager@yarabyte.com'
const MOIS = [4, 5] as const
const ANNEE = 2026

/** Valeurs réalisées par kpiEmployeId puis par mois (taux > 90 % pour cible 100). */
const VALEURS_PAR_KPI: Record<number, Record<number, number>> = {
  65: { 4: 96, 5: 98 },
  66: { 4: 95, 5: 97 },
  67: { 4: 94, 5: 96 },
}

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: EMAIL },
    select: { id: true, nom: true, prenom: true },
  })
  if (!user) {
    console.error(`Utilisateur ${EMAIL} introuvable.`)
    process.exit(1)
  }
  console.log(`Utilisateur : ${user.prenom} ${user.nom} (id=${user.id})`)

  const periode = await prisma.periode.findFirst({
    where: {
      annee: ANNEE,
      mois_debut: { lte: 4 },
      mois_fin: { gte: 5 },
      actif: true,
    },
    select: { id: true, code: true, mois_debut: true, mois_fin: true, annee: true },
  })
  if (!periode) {
    console.error('Aucune période active couvrant avril-mai 2026.')
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
      assigneParId: true,
      catalogueKpi: { select: { nom: true, type: true } },
    },
  })
  if (kpiEmployes.length === 0) {
    console.log('Aucun KPI validé pour cette période.')
    process.exit(0)
  }

  for (const ke of kpiEmployes) {
    const valeursMois = VALEURS_PAR_KPI[ke.id]
    if (!valeursMois) {
      console.warn(`  Pas de valeurs définies pour KPI id=${ke.id}, ignoré.`)
      continue
    }

    for (const mois of MOIS) {
      if (mois < periode.mois_debut || mois > periode.mois_fin) continue

      const type = ke.catalogueKpi?.type ?? 'QUANTITATIF'
      let valeur = valeursMois[mois]
      if (valeur == null) continue

      if (type === 'COMPORTEMENTAL') {
        valeur = Math.min(4, Math.max(1, Math.round(ke.cible)))
      } else if (type === 'QUALITATIF') {
        valeur = Math.min(5, Math.max(0, valeur / 20))
      }

      const tauxPct = type === 'QUANTITATIF' && ke.cible > 0
        ? Math.round((valeur / ke.cible) * 1000) / 10
        : null

      const soumisLe = new Date(ANNEE, mois, 8, 10, 0, 0)
      const valideLe = new Date(ANNEE, mois, 10, 14, 0, 0)

      await prisma.saisieMensuelle.upsert({
        where: {
          kpiEmployeId_mois_annee: {
            kpiEmployeId: ke.id,
            mois,
            annee: ANNEE,
          },
        },
        create: {
          kpiEmployeId: ke.id,
          employeId: user.id,
          mois,
          annee: ANNEE,
          valeur_realisee: valeur,
          statut: 'VALIDEE',
          en_retard: false,
          soumis_le: soumisLe,
          valide_le: valideLe,
          valideParId: ke.assigneParId,
        },
        update: {
          valeur_realisee: valeur,
          statut: 'VALIDEE',
          en_retard: false,
          soumis_le: soumisLe,
          valide_le: valideLe,
          valideParId: ke.assigneParId,
        },
      })

      const tauxLabel = tauxPct != null ? ` → ${tauxPct}%` : ''
      console.log(`  ✓ ${ke.catalogueKpi?.nom} — ${mois}/${ANNEE} : ${valeur}${tauxLabel}`)
    }
  }

  console.log(`\nSaisies avril & mai ${ANNEE} créées/mises à jour pour ${EMAIL}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
