/**
 * Synchronise les 17 directions officielles BGFI (liste client).
 * Met à jour code + nom si une direction équivalente existe déjà.
 * À lancer : pnpm run seed:directions-officielles
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

/** 17 directions officielles (acronyme + libellé). */
export const DIRECTIONS_OFFICIELLES: Array<{ code: string; nom: string }> = [
  { code: 'DG', nom: 'Direction Générale' },
  { code: 'DAG', nom: "Direction de l'Administration Générale" },
  { code: 'DAI', nom: "Direction de l'Audit Interne" },
  { code: 'DBP', nom: 'Direction de la Banque Privée' },
  { code: 'DCB', nom: 'Direction du Corporate Banking' },
  { code: 'DCHT', nom: 'Direction du Capital et de la Transformation' },
  { code: 'DCMR', nom: 'Direction de la Communication, du Marketing & RSE' },
  { code: 'DCON', nom: 'Direction de la Conformité' },
  { code: 'DCP', nom: 'Direction du Contrôle Permanent' },
  { code: 'DDE', nom: 'Direction des Engagements' },
  { code: 'DF', nom: 'Direction Financière' },
  { code: 'DI', nom: 'Direction Informatique' },
  { code: 'DGAJR', nom: 'Direction de la Gouvernance, des Affaires Juridiques et du Recouvrement' },
  { code: 'DOT', nom: 'Direction des Opérations et de la Trésorerie' },
  { code: 'DQASC', nom: "Direction de la Qualité, de l'Administration Bancaire et du Service Client" },
  { code: 'DR', nom: 'Direction des Risques' },
  { code: 'DRB', nom: 'Direction du Retail Banking' },
]

/** Anciens codes seed → code officiel. */
const LEGACY_CODE_TO_OFFICIAL: Record<string, string> = {
  DIR_DG: 'DG',
  DIR_ADM_GEN: 'DAG',
  DIR_AUDIT: 'DAI',
  DIR_BANQUE_PRIVEE: 'DBP',
  DIR_CORP_BANK: 'DCB',
  DIR_CAP_TRANSFO: 'DCHT',
  DIR_COM_MARK_RSE: 'DCMR',
  DIR_CONFORMITE: 'DCON',
  DIR_CTRL_PERM: 'DCP',
  DIR_ENGAGEMENTS: 'DDE',
  DIR_FIN: 'DF',
  DIR_DSI: 'DI',
  DIR_GOUV_JUR: 'DGAJR',
  DIR_OPS_TRES: 'DOT',
  DIR_QUAL_ADM_SC: 'DQASC',
  DIR_RIS: 'DR',
  DIR_RETAIL: 'DRB',
}

function normalizeNom(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function findMatch(
  cible: { code: string; nom: string },
  existing: Array<{ id: number; nom: string; code: string }>
) {
  const byCode = existing.find((d) => d.code === cible.code)
  if (byCode) return byCode

  const legacyCodes = Object.entries(LEGACY_CODE_TO_OFFICIAL)
    .filter(([, off]) => off === cible.code)
    .map(([leg]) => leg)
  const byLegacy = existing.find((d) => legacyCodes.includes(d.code))
  if (byLegacy) return byLegacy

  const normCible = normalizeNom(cible.nom)
  const byNom = existing.find((d) => normalizeNom(d.nom) === normCible)
  if (byNom) return byNom

  if (cible.code === 'DI') {
    return existing.find((d) => /informatique|syst[eè]mes?\s+d['']information/i.test(d.nom))
  }
  if (cible.code === 'DCHT') {
    return existing.find((d) => /capital.*transformation/i.test(d.nom))
  }
  if (cible.code === 'DDE') {
    return existing.find((d) => /engagements|cr[eé]dit/i.test(d.nom))
  }

  return undefined
}

async function main() {
  const etab = await prisma.etablissement.findFirst()
  if (!etab) {
    throw new Error("Aucun établissement. Lancez d'abord le seed principal.")
  }

  const existing = await prisma.direction.findMany({
    where: { etablissementId: etab.id },
    select: { id: true, nom: true, code: true },
  })

  let created = 0
  let updated = 0
  let unchanged = 0

  for (const dir of DIRECTIONS_OFFICIELLES) {
    const match = findMatch(dir, existing)

    if (match) {
      if (match.code === dir.code && match.nom === dir.nom) {
        console.log(`Inchangée : ${dir.nom} (${dir.code})`)
        unchanged++
        continue
      }
      await prisma.direction.update({
        where: { id: match.id },
        data: { code: dir.code, nom: dir.nom, actif: true },
      })
      const idx = existing.findIndex((d) => d.id === match.id)
      if (idx >= 0) existing[idx] = { ...match, code: dir.code, nom: dir.nom }
      console.log(`Mise à jour : ${match.nom} (${match.code}) → ${dir.nom} (${dir.code})`)
      updated++
      continue
    }

    const createdDir = await prisma.direction.create({
      data: {
        nom: dir.nom,
        code: dir.code,
        etablissementId: etab.id,
        actif: true,
      },
    })
    existing.push({ id: createdDir.id, nom: dir.nom, code: dir.code })
    console.log(`Créée : ${dir.nom} (${dir.code})`)
    created++
  }

  console.log(`\nTerminé : ${created} créée(s), ${updated} mise(s) à jour, ${unchanged} inchangée(s).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
