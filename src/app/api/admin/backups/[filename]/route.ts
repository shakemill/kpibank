import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { apiError } from '@/lib/api-response'
import { auditFromRequest, AuditAction } from '@/lib/audit-log'
import { isSafeBackupFilename, readBackupFile } from '@/lib/backup'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const result = await getSessionAndRequireDG()
  if (result.error) return apiError(result.error, result.status)

  const filename = decodeURIComponent((await params).filename)
  if (!isSafeBackupFilename(filename)) {
    return apiError('Nom de fichier invalide', 400)
  }

  try {
    const buffer = await readBackupFile(filename)
    const userId = (result.session.user as { id?: string }).id
    await auditFromRequest(request, {
      userId,
      action: AuditAction.BACKUP_DOWNLOAD,
      entityType: 'Backup',
      entityId: filename,
    })
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return apiError('Sauvegarde introuvable', 404)
    return apiError(
      'Impossible de télécharger la sauvegarde',
      500,
      e instanceof Error ? e.message : e
    )
  }
}

export const dynamic = 'force-dynamic'
