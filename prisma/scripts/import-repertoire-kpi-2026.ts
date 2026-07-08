/**
 * Importe le répertoire officiel KPI BGFI 2026 depuis l'Excel embarqué.
 * À lancer : pnpm run import:repertoire-kpi-2026
 *
 * Mapping Excel :
 *   Objectifs Qualité (Stratégique) → nom (+ objectif_qualite)
 *   Indicateurs                     → description (+ formule)
 *
 * Prérequis :
 *   pnpm run seed:directions-bgfi
 *   pnpm run add-periodes-2026
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'
import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  detecterSensCalcul,
  mapperFrequenceExcel,
  modeAgregationDepuisFrequence,
  normaliserCibleExcel,
  repartirPoidsEgaux,
  typeKpiDepuisIndicateur,
  uniteDepuisSens,
  type CategorieKpi,
  type FrequenceKpi,
  type SensCalculKpi,
} from '../../src/lib/kpi-cible-utils'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const EXCEL_PATH = path.join(__dirname, '../data/repertoire-indicateurs-2026.xlsx')

/** Mapping direction Excel (colonne « Direction ») → code direction organisationnelle. */
const DIRECTION_TO_CODE: Record<string, string> = {
  'Audit Interne': 'DAI',
  'Capital Humain': 'DCHT',
  'Communication, Marketing & RSE': 'DCMR',
  'Conformité': 'DCON',
  'Contrôle Permanent': 'DCP',
  'Corporate Banking': 'DCB',
  'Crédit': 'DDE',
  'Exploitation Informatique': 'DI',
  'Finance': 'DF',
  'Gestion des risques': 'DR',
  'Gouvernance, Juridque et Recouvrement': 'DGAJR',
  'Monétique': 'DIR_MONETIQUE',
  'Moyens Généraux & Sécurité': 'DAG',
  'Opérations et Trésorerie': 'DOT',
  'Private Banking': 'DBP',
  'Projets & Organisation': 'DIR_PROJ_ORG',
  'Qualité': 'DQASC',
  'Retail Banking': 'DRB',
  'Service après Vente': 'DQASC',
  'Stratégie & Développement': 'DIR_STRAT_DEV',
  "Sécurité des Systèmes d'Information / Continuité des Activités": 'DI',
}

type ExcelRow = {
  code: string
  direction: string
  objectif: string
  indicateur: string
  type: string
  freq: string
  cible: unknown
}

function lireExcel(): ExcelRow[] {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Fichier introuvable : ${EXCEL_PATH}`)
  }
  const wb = XLSX.readFile(EXCEL_PATH)
  const ws = wb.Sheets['KPI Globale']
  if (!ws) throw new Error('Feuille "KPI Globale" introuvable')

  const rows: ExcelRow[] = []
  const data = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1, defval: null })
  for (let i = 4; i < data.length; i++) {
    const row = data[i]
    if (!row || !row.some(Boolean)) continue
    const [code, direction, objectif, indicateur, type, freq, cible] = row
    if (!direction || !objectif || !indicateur) continue
    rows.push({
      code: String(code ?? '').trim(),
      direction: String(direction).trim(),
      objectif: String(objectif).trim(),
      indicateur: String(indicateur).trim(),
      type: String(type ?? '').trim(),
      freq: String(freq ?? '').trim(),
      cible,
    })
  }
  return rows
}

function mapperCategorie(typeExcel: string): CategorieKpi {
  return typeExcel.toLowerCase().includes('opérationnel') ||
    typeExcel.toLowerCase().includes('operationnel')
    ? 'OPERATIONNEL'
    : 'STRATEGIQUE'
}

async function main() {
  const rows = lireExcel()
  console.log(`${rows.length} KPI lus depuis l'Excel.`)

  const periode = await prisma.periode.findFirst({ where: { code: 'S1-2026' } })
  if (!periode) {
    throw new Error('Période S1-2026 introuvable. Lancez add-periodes-2026.')
  }

  const directions = await prisma.direction.findMany({
    select: { id: true, code: true, nom: true },
  })
  const dirByCode = new Map(directions.map((d) => [d.code, d]))

  const creePar =
    (await prisma.user.findFirst({ where: { role: 'DG', actif: true } })) ??
    (await prisma.user.findFirst({ where: { role: 'DIRECTEUR', actif: true } }))
  if (!creePar) {
    throw new Error('Aucun utilisateur DG ou DIRECTEUR trouvé pour creeParId.')
  }

  let catalogueCreated = 0
  let catalogueUpdated = 0
  const importedCatalogueIds = new Set<number>()
  const excelCodes = new Set<string>()
  const directionKpis = new Map<string, Array<{ catalogueId: number; cible: number }>>()
  const directionsManquantes = new Set<string>()

  for (const row of rows) {
    if (row.code) excelCodes.add(row.code)

    const dirCode = DIRECTION_TO_CODE[row.direction]
    if (!dirCode) {
      console.warn(`Direction non mappée : "${row.direction}" (${row.code})`)
      continue
    }
    if (!dirByCode.has(dirCode)) {
      directionsManquantes.add(`${row.direction} → ${dirCode}`)
      continue
    }

    const nom = row.objectif
    const description = row.indicateur
    const sensCalcul = detecterSensCalcul(description, row.cible) as SensCalculKpi
    const frequence = mapperFrequenceExcel(row.freq) as FrequenceKpi
    const typeKpi = typeKpiDepuisIndicateur(description)
    const cibleNormalisee = normaliserCibleExcel(row.cible, sensCalcul)

    const catalogueData = {
      code: row.code || null,
      nom,
      description,
      objectif_qualite: row.objectif,
      formule: row.indicateur,
      type: typeKpi as 'QUANTITATIF' | 'QUALITATIF',
      categorie: mapperCategorie(row.type) as 'STRATEGIQUE' | 'OPERATIONNEL',
      frequence: frequence as 'MENSUELLE' | 'TRIMESTRIELLE' | 'SEMESTRIELLE' | 'ANNUELLE' | 'EVENEMENTIELLE',
      sens_calcul: sensCalcul as 'DIRECT' | 'PLAFOND' | 'ZERO_DEFAUT' | 'ABSOLU',
      unite: uniteDepuisSens(sensCalcul, typeKpi, row.cible),
      mode_agregation: modeAgregationDepuisFrequence(frequence) as 'CUMUL' | 'MOYENNE' | 'DERNIER',
      portee: 'INDIVIDUEL' as const,
      actif: true,
    }

    let catalogue = row.code
      ? await prisma.catalogueKpi.findUnique({ where: { code: row.code } })
      : null

    if (catalogue) {
      await prisma.catalogueKpi.update({
        where: { id: catalogue.id },
        data: catalogueData,
      })
      catalogueUpdated++
    } else {
      catalogue = await prisma.catalogueKpi.create({ data: catalogueData })
      catalogueCreated++
    }

    importedCatalogueIds.add(catalogue.id)

    const list = directionKpis.get(dirCode) ?? []
    list.push({
      catalogueId: catalogue.id,
      cible: cibleNormalisee,
    })
    directionKpis.set(dirCode, list)
  }

  console.log(`Catalogue : ${catalogueCreated} créé(s), ${catalogueUpdated} mis à jour.`)

  // Supprimer tous les KPI catalogue absents du répertoire Excel
  const horsRepertoire = await prisma.catalogueKpi.findMany({
    where: { id: { notIn: [...importedCatalogueIds] } },
    select: { id: true, code: true, nom: true },
  })
  if (horsRepertoire.length > 0) {
    const deleted = await prisma.catalogueKpi.deleteMany({
      where: { id: { in: horsRepertoire.map((k) => k.id) } },
    })
    console.log(
      `\n${deleted.count} KPI catalogue supprimé(s) (hors répertoire Excel) :`
    )
    horsRepertoire.slice(0, 10).forEach((k) => {
      console.log(`  - ${k.code ?? 'sans code'} : ${k.nom.slice(0, 60)}${k.nom.length > 60 ? '…' : ''}`)
    })
    if (horsRepertoire.length > 10) {
      console.log(`  … et ${horsRepertoire.length - 10} autre(s)`)
    }
  } else {
    console.log('\nAucun KPI hors répertoire à supprimer.')
  }

  if (directionsManquantes.size > 0) {
    console.warn('\nDirections manquantes en base :')
    directionsManquantes.forEach((d) => console.warn(`  - ${d}`))
  }

  let kpiDirCreated = 0

  for (const [dirCode, kpis] of directionKpis) {
    const direction = dirByCode.get(dirCode)!
    const poidsList = repartirPoidsEgaux(kpis.length)

    await prisma.kpiDirection.deleteMany({
      where: { directionId: direction.id, periodeId: periode.id },
    })

    for (let i = 0; i < kpis.length; i++) {
      const kpi = kpis[i]
      await prisma.kpiDirection.create({
        data: {
          catalogueKpiId: kpi.catalogueId,
          directionId: direction.id,
          periodeId: periode.id,
          cible: kpi.cible,
          poids: poidsList[i],
          description_complementaire: null,
          statut: 'ACTIF',
          creeParId: creePar.id,
        },
      })
      kpiDirCreated++
    }
    console.log(`  ${direction.nom} (${dirCode}) : ${kpis.length} KPI direction`)
  }

  console.log(`\nKpiDirection S1-2026 : ${kpiDirCreated} créé(s).`)
  console.log(`Répertoire final : ${importedCatalogueIds.size} KPI catalogue (codes Excel : ${excelCodes.size}).`)
  console.log('Import terminé.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
