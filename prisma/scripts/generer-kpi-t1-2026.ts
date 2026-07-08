/**
 * Crée T1-2026, duplique les KPI employé depuis T2-2026 (ou autre période 2026 source)
 * et génère des saisies validées pour janvier, février et mars 2026.
 *
 * pnpm exec tsx prisma/scripts/generer-kpi-t1-2026.ts
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const CODE_CIBLE = 'T1-2026'
const CODE_SOURCE_PREF = 'T2-2026'
const MOIS = [1, 2, 3] as const
const ANNEE = 2026

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

function dateLimiteSaisie(annee: number, moisFin: number): Date {
  const moisSuivant = moisFin === 12 ? 1 : moisFin + 1
  const anneeSuivante = moisFin === 12 ? annee + 1 : annee
  return new Date(anneeSuivante, moisSuivant - 1, 10)
}

function valeurPourMois(
  kpiEmployeId: number,
  mois: number,
  cible: number,
  type: string
): number {
  const seed = (kpiEmployeId * 17 + mois * 31) % 9
  if (type === 'COMPORTEMENTAL') {
    return Math.min(4, Math.max(1, Math.round(cible)))
  }
  if (type === 'QUALITATIF') {
    return Math.min(5, Math.max(3, 3 + (seed % 3)))
  }
  if (cible > 0) {
    const taux = 0.9 + seed / 100
    return Math.round(cible * taux * 100) / 100
  }
  return 90 + seed
}

async function ensurePeriodeT1() {
  let periode = await prisma.periode.findFirst({ where: { code: CODE_CIBLE } })
  if (!periode) {
    periode = await prisma.periode.create({
      data: {
        type: 'TRIMESTRIEL',
        code: CODE_CIBLE,
        mois_debut: 1,
        mois_fin: 3,
        annee: ANNEE,
        date_debut: new Date(`${ANNEE}-01-01`),
        date_fin: new Date(`${ANNEE}-03-31`),
        date_limite_saisie: dateLimiteSaisie(ANNEE, 3),
        statut: 'EN_COURS',
        actif: true,
      },
    })
    console.log(`Période ${CODE_CIBLE} créée (id=${periode.id}).`)
  } else {
    await prisma.periode.update({
      where: { id: periode.id },
      data: { statut: 'EN_COURS', actif: true },
    })
    console.log(`Période ${CODE_CIBLE} déjà présente (id=${periode.id}).`)
  }
  return periode
}

async function findPeriodeSource() {
  const pref = await prisma.periode.findFirst({ where: { code: CODE_SOURCE_PREF } })
  if (pref) {
    const count = await prisma.kpiEmploye.count({
      where: { periodeId: pref.id, statut: { in: ['VALIDE', 'CLOTURE'] } },
    })
    if (count > 0) return pref
  }

  const periodes2026 = await prisma.periode.findMany({
    where: { annee: ANNEE, code: { not: CODE_CIBLE } },
    orderBy: { mois_debut: 'asc' },
  })
  for (const p of periodes2026) {
    const count = await prisma.kpiEmploye.count({
      where: { periodeId: p.id, statut: { in: ['VALIDE', 'CLOTURE'] } },
    })
    if (count > 0) return p
  }
  return null
}

async function main() {
  const periodeT1 = await ensurePeriodeT1()
  const periodeSource = await findPeriodeSource()
  if (!periodeSource) {
    console.error('Aucune période source avec KPI employé trouvée (ex. T2-2026).')
    process.exit(1)
  }
  console.log(`Source : ${periodeSource.code} (id=${periodeSource.id})`)

  const kpiSource = await prisma.kpiEmploye.findMany({
    where: {
      periodeId: periodeSource.id,
      statut: { in: ['VALIDE', 'CLOTURE'] },
    },
    include: {
      employe: { select: { email: true, prenom: true, nom: true } },
      catalogueKpi: { select: { nom: true, type: true } },
    },
  })
  if (kpiSource.length === 0) {
    console.log('Aucun KPI employé à dupliquer.')
    process.exit(0)
  }

  const existants = await prisma.kpiEmploye.findMany({
    where: { periodeId: periodeT1.id },
    select: { employeId: true, catalogueKpiId: true, id: true },
  })
  const existantSet = new Set(existants.map((e) => `${e.employeId}-${e.catalogueKpiId}`))
  const kpiT1ByKey = new Map(existants.map((e) => [`${e.employeId}-${e.catalogueKpiId}`, e.id]))

  let crees = 0
  for (const k of kpiSource) {
    const key = `${k.employeId}-${k.catalogueKpiId}`
    if (existantSet.has(key)) continue

    const created = await prisma.kpiEmploye.create({
      data: {
        catalogueKpiId: k.catalogueKpiId,
        employeId: k.employeId,
        assigneParId: k.assigneParId,
        kpiServiceId: null,
        periodeId: periodeT1.id,
        cible: k.cible,
        poids: k.poids,
        statut: 'VALIDE',
        date_notification: k.date_notification,
        date_acceptation: k.date_acceptation ?? new Date(),
      },
    })
    kpiT1ByKey.set(key, created.id)
    existantSet.add(key)
    crees++
    console.log(
      `  + KPI ${created.id} — ${k.employe.prenom} ${k.employe.nom} : ${k.catalogueKpi.nom}`
    )
  }
  console.log(`${crees} KPI employé créés (${kpiSource.length - crees} déjà présents).`)

  const kpiT1 = await prisma.kpiEmploye.findMany({
    where: { periodeId: periodeT1.id, statut: { in: ['VALIDE', 'CLOTURE'] } },
    select: {
      id: true,
      employeId: true,
      cible: true,
      assigneParId: true,
      catalogueKpi: { select: { nom: true, type: true } },
    },
  })

  let saisiesCrees = 0
  for (const ke of kpiT1) {
    const type = ke.catalogueKpi?.type ?? 'QUANTITATIF'
    for (const mois of MOIS) {
      const valeur = valeurPourMois(ke.id, mois, ke.cible, type)
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
          employeId: ke.employeId,
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
      saisiesCrees++
      const taux =
        type === 'QUANTITATIF' && ke.cible > 0
          ? ` (${Math.round((valeur / ke.cible) * 1000) / 10}%)`
          : ''
      console.log(`  ✓ ${ke.catalogueKpi?.nom} — ${mois}/${ANNEE} : ${valeur}${taux}`)
    }
  }

  console.log(`\n${saisiesCrees} saisies T1 générées pour ${kpiT1.length} KPI sur ${CODE_CIBLE}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
