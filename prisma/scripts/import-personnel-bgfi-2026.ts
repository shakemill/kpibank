/**
 * Importe les utilisateurs depuis l'Excel personnel BGFI.
 * Mot de passe par défaut : BgfiKpi@
 * Rôle par défaut : EMPLOYE
 *
 * À lancer : pnpm run import:personnel-bgfi-2026
 * Fichier par défaut : prisma/data/liste-personnel-bgfi-2026.xlsx
 * Surcharge : IMPORT_PERSONNEL_XLSX=/chemin/vers/fichier.xlsx pnpm run import:personnel-bgfi-2026
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const DEFAULT_PASSWORD = 'BgfiKpi@'
const DEFAULT_EXCEL = path.join(__dirname, '../data/liste-personnel-bgfi-2026.xlsx')

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

type ExcelRow = {
  NOM?: string
  PRENOM?: string
  'POSTE OCCUPE'?: string
  'Adresses mails'?: string
}

function normaliserTexte(value: unknown): string {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function normaliserEmail(value: unknown): string {
  return normaliserTexte(value).toLowerCase()
}

async function main() {
  const excelPath = process.env.IMPORT_PERSONNEL_XLSX ?? DEFAULT_EXCEL
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Fichier Excel introuvable : ${excelPath}`)
  }

  const workbook = XLSX.read(fs.readFileSync(excelPath), { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('Aucune feuille dans le fichier Excel.')

  const rows = XLSX.utils.sheet_to_json<ExcelRow>(workbook.Sheets[sheetName], { defval: '' })
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10)

  const existingUsers = await prisma.user.findMany({ select: { email: true } })
  const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()))
  const seenInFile = new Set<string>()

  let created = 0
  let updated = 0
  let skippedExisting = 0
  let skippedDuplicateFile = 0
  let skippedInvalid = 0

  for (const [index, row] of rows.entries()) {
    const line = index + 2
    const email = normaliserEmail(row['Adresses mails'])
    const nom = normaliserTexte(row.NOM)
    const prenom = normaliserTexte(row.PRENOM)
    const posteOccupe = normaliserTexte(row['POSTE OCCUPE']) || null

    if (!email) {
      console.warn(`Ligne ${line} : ignorée (email manquant) — ${nom}`)
      skippedInvalid++
      continue
    }
    if (!nom) {
      console.warn(`Ligne ${line} : ignorée (nom manquant) — ${email}`)
      skippedInvalid++
      continue
    }
    if (seenInFile.has(email)) {
      console.warn(`Ligne ${line} : doublon dans le fichier — ${email}`)
      skippedDuplicateFile++
      continue
    }
    seenInFile.add(email)

    if (existingEmails.has(email)) {
      if (!prenom) {
        const result = await prisma.user.updateMany({
          where: { email, prenom: { not: '' } },
          data: { prenom: '' },
        })
        if (result.count > 0) updated += result.count
      }
      skippedExisting++
      continue
    }

    await prisma.user.create({
      data: {
        nom,
        prenom,
        email,
        posteOccupe,
        password: passwordHash,
        role: 'EMPLOYE',
        actif: true,
        force_password_change: false,
      },
    })
    existingEmails.add(email)
    created++
  }

  console.log(`Import terminé depuis : ${excelPath}`)
  console.log(`${created} utilisateur(s) créé(s).`)
  console.log(`${updated} prénom(s) corrigé(s) (laissé vide).`)
  console.log(`${skippedExisting} déjà présent(s) en base.`)
  console.log(`${skippedDuplicateFile} doublon(s) ignoré(s) dans le fichier.`)
  console.log(`${skippedInvalid} ligne(s) invalide(s) ignorée(s).`)
  console.log(`Mot de passe par défaut : ${DEFAULT_PASSWORD}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
