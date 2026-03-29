import { prisma } from '@/lib/prisma'

export type CreateAuditLogParams = {
  userId?: number
  action: string
  entityType?: string
  entityId?: string
  details?: string
  ip?: string
  userAgent?: string
}

/** Enregistre une entrée d'audit. Les logs sont purgés après 1 an. */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? undefined,
        action: params.action,
        entityType: params.entityType ?? undefined,
        entityId: params.entityId ?? undefined,
        details: params.details ?? undefined,
        ip: params.ip ?? undefined,
        userAgent: params.userAgent ?? undefined,
      },
    })
  } catch (e) {
    console.error('[audit-log]', e)
  }
}
