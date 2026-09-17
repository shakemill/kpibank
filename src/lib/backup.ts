/**
 * Sauvegarde JSON gzip de la base (tables métier, hors sessions NextAuth).
 */

import { gzipSync } from 'zlib'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/prisma'

export const BACKUP_FORMAT_VERSION = 1
export const BACKUP_FILENAME_RE = /^kpi-banque-\d{8}-\d{6}\.json\.gz$/

/** Délégates Prisma des tables à inclure (hors Account / Session / VerificationToken). */
export const BACKUP_TABLES = [
  'etablissement',
  'direction',
  'service',
  'user',
  'periode',
  'catalogueKpi',
  'directionCatalogueKpi',
  'kpiDirection',
  'kpiService',
  'kpiEmploye',
  'saisieMensuelle',
  'saisieDirection',
  'saisiePeriodeOuverte',
  'scorePeriode',
  'scorePeriodeDirection',
  'consolidationService',
  'consolidationDirection',
  'notationGrilleNiveau',
  'parametre',
  'notification',
  'auditLog',
] as const

export type BackupTableName = (typeof BACKUP_TABLES)[number]

export type BackupFileInfo = {
  filename: string
  size: number
  createdAt: string
}

export type BackupCreated = BackupFileInfo & {
  tableCounts: Record<string, number>
}

type FindManyDelegate = { findMany: () => Promise<unknown[]> }

export function getBackupDir(): string {
  return process.env.BACKUP_DIR?.trim() || path.join(process.cwd(), 'data', 'backups')
}

export function getBackupKeep(): number {
  const n = parseInt(process.env.BACKUP_KEEP ?? '10', 10)
  return Number.isFinite(n) && n > 0 ? n : 10
}

export function isSafeBackupFilename(filename: string): boolean {
  return BACKUP_FILENAME_RE.test(filename)
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function makeBackupFilename(date = new Date()): string {
  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())
  const h = pad2(date.getHours())
  const min = pad2(date.getMinutes())
  const s = pad2(date.getSeconds())
  return `kpi-banque-${y}${m}${d}-${h}${min}${s}.json.gz`
}

export function resolveBackupPath(filename: string): string {
  if (!isSafeBackupFilename(filename)) {
    throw new Error('Nom de fichier invalide')
  }
  const dir = path.resolve(getBackupDir())
  const resolved = path.resolve(dir, filename)
  if (!resolved.startsWith(dir + path.sep) && resolved !== dir) {
    throw new Error('Nom de fichier invalide')
  }
  return resolved
}

async function dumpTables(): Promise<{
  tables: Record<string, unknown[]>
  tableCounts: Record<string, number>
}> {
  const tables: Record<string, unknown[]> = {}
  const tableCounts: Record<string, number> = {}
  for (const name of BACKUP_TABLES) {
    const delegate = prisma[name] as unknown as FindManyDelegate
    const rows = await delegate.findMany()
    tables[name] = rows
    tableCounts[name] = rows.length
  }
  return { tables, tableCounts }
}

export async function listBackups(): Promise<BackupFileInfo[]> {
  const dir = getBackupDir()
  await fs.mkdir(dir, { recursive: true })
  const names = await fs.readdir(dir)
  const infos: BackupFileInfo[] = []
  for (const name of names) {
    if (!isSafeBackupFilename(name)) continue
    const st = await fs.stat(path.join(dir, name))
    if (!st.isFile()) continue
    infos.push({
      filename: name,
      size: st.size,
      createdAt: st.mtime.toISOString(),
    })
  }
  infos.sort((a, b) => b.filename.localeCompare(a.filename))
  return infos
}

export async function pruneOldBackups(): Promise<number> {
  const keep = getBackupKeep()
  const list = await listBackups()
  const extra = list.slice(keep)
  for (const item of extra) {
    await fs.unlink(resolveBackupPath(item.filename))
  }
  return extra.length
}

export async function createBackup(): Promise<BackupCreated> {
  const dir = getBackupDir()
  await fs.mkdir(dir, { recursive: true })

  let filename = makeBackupFilename()
  let filePath = path.join(dir, filename)
  if (await fileExists(filePath)) {
    filename = makeBackupFilename(new Date(Date.now() + 1000))
    filePath = path.join(dir, filename)
  }

  const { tables, tableCounts } = await dumpTables()
  const payload = {
    version: BACKUP_FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    tables,
  }
  const gz = gzipSync(Buffer.from(JSON.stringify(payload), 'utf8'))
  await fs.writeFile(filePath, gz)
  await pruneOldBackups()

  const st = await fs.stat(filePath)
  return {
    filename,
    size: st.size,
    createdAt: st.mtime.toISOString(),
    tableCounts,
  }
}

export async function readBackupFile(filename: string): Promise<Buffer> {
  const filePath = resolveBackupPath(filename)
  return fs.readFile(filePath)
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}
