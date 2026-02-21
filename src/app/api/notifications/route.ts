import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return apiError('Non authentifié', 401)
  const userId = parseInt((session.user as { id?: string }).id ?? '', 10)
  if (Number.isNaN(userId)) return apiError('Session invalide', 401)

  const { searchParams } = new URL(request.url)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10) || 10))
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0)
  const luParam = searchParams.get('lu')
  const typeParam = searchParams.get('type')

  const where = {
    destinataireId: userId,
    ...(luParam === 'true' ? { lu: true } : luParam === 'false' ? { lu: false } : {}),
    ...(typeParam ? { type: typeParam } : {}),
  }

  const [list, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        type: true,
        titre: true,
        message: true,
        lu: true,
        lien: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where }),
  ])

  return apiSuccess({ list, total })
}
