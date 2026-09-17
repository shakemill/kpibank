/**
 * Crée une sauvegarde SQL de la base (même format que l’espace admin).
 * Usage: pnpm backup:db
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { createBackup, getBackupDir, getBackupKeep } from '../src/lib/backup'

async function main() {
  const created = await createBackup()
  console.log(`Sauvegarde : ${created.filename}`)
  console.log(`Répertoire : ${getBackupDir()}`)
  console.log(`Taille     : ${created.size} octets`)
  console.log(`Rétention  : ${getBackupKeep()} fichier(s)`)
  const counts = Object.entries(created.tableCounts)
    .map(([name, n]) => `${name}=${n}`)
    .join(', ')
  console.log(`Tables (${Object.keys(created.tableCounts).length}) : ${counts}`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
