import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export { AuditAction, AUDIT_ACTION_LABELS, libellerActionAudit } from '@/lib/audit-actions'
export type { AuditActionCode } from '@/lib/audit-actions'

export type CreateAuditLogParams = {
  userId?: number | string | null
  action: string
  entityType?: string | null
  entityId?: string | number | null
  details?: string | null
  ip?: string | null
  userAgent?: string | null
}

function clientIpFromHeaders(headers: Headers): string | undefined {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first.slice(0, 100)
  }
  const realIp = headers.get('x-real-ip')?.trim()
  if (realIp) return realIp.slice(0, 100)
  return undefined
}

export function extractRequestMeta(request: Request | NextRequest): {
  ip?: string
  userAgent?: string
} {
  const headers = request.headers
  return {
    ip: clientIpFromHeaders(headers),
    userAgent: headers.get('user-agent')?.slice(0, 500) || undefined,
  }
}

function sessionUserId(userId: number | string | null | undefined): number | undefined {
  if (userId == null || userId === '') return undefined
  const n = typeof userId === 'number' ? userId : parseInt(String(userId), 10)
  return Number.isNaN(n) ? undefined : n
}

/** Enregistre une entrée d'audit. Les logs sont purgés après 1 an. */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: sessionUserId(params.userId) ?? undefined,
        action: params.action,
        entityType: params.entityType ?? undefined,
        entityId:
          params.entityId != null && params.entityId !== ''
            ? String(params.entityId)
            : undefined,
        details: params.details ?? undefined,
        ip: params.ip ?? undefined,
        userAgent: params.userAgent ?? undefined,
      },
    })
  } catch (e) {
    console.error('[audit-log]', e)
  }
}

/** Audit depuis une requête HTTP (IP + User-Agent). */
export async function auditFromRequest(
  request: Request | NextRequest,
  params: Omit<CreateAuditLogParams, 'ip' | 'userAgent'>
): Promise<void> {
  const meta = extractRequestMeta(request)
  await createAuditLog({ ...params, ...meta })
}
