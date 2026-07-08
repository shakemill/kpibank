/**
 * Ajoute les directions BGFI (liste client) sauf celles déjà présentes.
 * À lancer : pnpm run seed:directions-bgfi
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

/** Directions cible (17 officielles BGFI). */
const DIRECTIONS_CIBLE: Array<{ nom: string; code: string }> = [
  { nom: 'Direction Générale', code: 'DG' },
  { nom: "Direction de l'Administration Générale", code: 'DAG' },
  { nom: "Direction de l'Audit Interne", code: 'DAI' },
  { nom: 'Direction de la Banque Privée', code: 'DBP' },
  { nom: 'Direction du Corporate Banking', code: 'DCB' },
  { nom: 'Direction du Capital et de la Transformation', code: 'DCHT' },
  { nom: 'Direction de la Communication, du Marketing & RSE', code: 'DCMR' },
  { nom: 'Direction de la Conformité', code: 'DCON' },
  { nom: 'Direction du Contrôle Permanent', code: 'DCP' },
  { nom: 'Direction des Engagements', code: 'DDE' },
  { nom: 'Direction Financière', code: 'DF' },
  { nom: 'Direction Informatique', code: 'DI' },
  {
    nom: 'Direction de la Gouvernance, des Affaires Juridiques et du Recouvrement',
    code: 'DGAJR',
  },
  { nom: 'Direction des Opérations et de la Trésorerie', code: 'DOT' },
  {
    nom: "Direction de la Qualité, de l'Administration Bancaire et du Service Client",
    code: 'DQASC',
  },
  { nom: 'Direction des Risques', code: 'DR' },
  { nom: 'Direction du Retail Banking', code: 'DRB' },
  // Directions complémentaires (répertoire Excel)
  { nom: 'Direction Monétique', code: 'DIR_MONETIQUE' },
  { nom: 'Direction Projets & Organisation', code: 'DIR_PROJ_ORG' },
  { nom: 'Direction Stratégie & Développement', code: 'DIR_STRAT_DEV' },
]

/** Codes / noms déjà couverts par les seeds existants (équivalences). */
const EXISTING_CODE_ALIASES: Record<string, string[]> = {
  DI: ['DIR_DSI', 'DI'],
  DR: ['DIR_RIS', 'DR'],
  DCHT: ['DIR_CAP_TRANSFO', 'DCHT'],
}

const EXISTING_NOM_PATTERNS: Array<{ pattern: RegExp; codes: string[] }> = [
  { pattern: /syst[eè]mes?\s+d['']information|direction informatique/i, codes: ['DI'] },
  { pattern: /risques/i, codes: ['DR'] },
  { pattern: /capital.*transformation/i, codes: ['DCHT'] },
]

function normalizeNom(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

async function directionExists(
  cible: { nom: string; code: string },
  existing: Array<{ nom: string; code: string }>
): Promise<boolean> {
  if (existing.some((d) => d.code === cible.code)) return true

  const aliases = EXISTING_CODE_ALIASES[cible.code] ?? []
  if (existing.some((d) => aliases.includes(d.code))) return true

  const normCible = normalizeNom(cible.nom)
  if (existing.some((d) => normalizeNom(d.nom) === normCible)) return true

  for (const { pattern, codes } of EXISTING_NOM_PATTERNS) {
    if (codes.includes(cible.code) && existing.some((d) => pattern.test(d.nom))) {
      return true
    }
  }

  return false
}

async function main() {
  const etab = await prisma.etablissement.findFirst()
  if (!etab) {
    throw new Error('Aucun établissement. Lancez d\'abord le seed principal.')
  }

  const existing = await prisma.direction.findMany({
    where: { etablissementId: etab.id },
    select: { nom: true, code: true },
  })

  console.log(`${existing.length} direction(s) déjà en base :`)
  existing.forEach((d) => console.log(`  - ${d.nom} (${d.code})`))

  let created = 0
  let skipped = 0

  for (const dir of DIRECTIONS_CIBLE) {
    if (await directionExists(dir, existing)) {
      console.log(`Ignorée (déjà présente) : ${dir.nom}`)
      skipped++
      continue
    }

    await prisma.direction.create({
      data: {
        nom: dir.nom,
        code: dir.code,
        etablissementId: etab.id,
        actif: true,
      },
    })
    existing.push({ nom: dir.nom, code: dir.code })
    console.log(`Créée : ${dir.nom} (${dir.code})`)
    created++
  }

  console.log(`\nTerminé : ${created} créée(s), ${skipped} ignorée(s).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
