import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function PUT() {
  const session = await auth()
  if (!session?.user) return apiError('Non authentifié', 401)
  const userId = parseInt((session.user as { id?: string }).id ?? '', 10)
  if (Number.isNaN(userId)) return apiError('Session invalide', 401)

  const result = await prisma.notification.updateMany({
    where: { destinataireId: userId, lu: false },
    data: { lu: true },
  })
  return apiSuccess({ ok: true, count: result.count })
}
