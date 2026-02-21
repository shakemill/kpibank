import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function PUT(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return apiError('Non authentifié', 401)
  const userId = parseInt((session.user as { id?: string }).id ?? '', 10)
  if (Number.isNaN(userId)) return apiError('Session invalide', 401)

  const id = parseInt((await context.params).id, 10)
  if (Number.isNaN(id)) return apiError('Id invalide', 400)

  const notification = await prisma.notification.findFirst({
    where: { id, destinataireId: userId },
  })
  if (!notification) return apiError('Notification introuvable', 404)

  const updated = await prisma.notification.update({
    where: { id },
    data: { lu: true },
    select: {
      id: true,
      type: true,
      titre: true,
      message: true,
      lu: true,
      lien: true,
      createdAt: true,
    },
  })
  return apiSuccess(updated)
}
