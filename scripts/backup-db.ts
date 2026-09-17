/**
 * Crée une sauvegarde JSON gzip de la base (même format que l’espace admin).
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
    .filter(([, n]) => n > 0)
    .map(([name, n]) => `${name}=${n}`)
    .join(', ')
  if (counts) console.log(`Tables     : ${counts}`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
