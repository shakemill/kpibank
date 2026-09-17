import { NextRequest } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { apiError, apiSuccess } from '@/lib/api-response'
import { auditFromRequest, AuditAction } from '@/lib/audit-log'
import { createBackup, getBackupKeep, listBackups } from '@/lib/backup'

export async function GET() {
  const result = await getSessionAndRequireDG()
  if (result.error) return apiError(result.error, result.status)
  try {
    const backups = await listBackups()
    return apiSuccess({ backups, keep: getBackupKeep() })
  } catch (e) {
    return apiError(
      'Impossible de lister les sauvegardes',
      500,
      e instanceof Error ? e.message : e
    )
  }
}

export async function POST(request: NextRequest) {
  const result = await getSessionAndRequireDG()
  if (result.error) return apiError(result.error, result.status)
  const userId = (result.session.user as { id?: string }).id
  try {
    const created = await createBackup()
    await auditFromRequest(request, {
      userId,
      action: AuditAction.BACKUP_CREATE,
      entityType: 'Backup',
      entityId: created.filename,
      details: `Taille ${created.size} octets`,
    })
    return apiSuccess(created, 201)
  } catch (e) {
    return apiError(
      'Échec de la sauvegarde',
      500,
      e instanceof Error ? e.message : e
    )
  }
}

export const dynamic = 'force-dynamic'
