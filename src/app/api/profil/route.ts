import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-response'

const profilUpdateSchema = z.object({
  telephone: z.string().max(30).optional().nullable(),
})

function getUserIdFromSession(session: { user?: { id?: string | number } }): number | null {
  const raw = session.user?.id
  const userId = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10)
  return Number.isNaN(userId) ? null : userId
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return apiError('Non authentifié', 401)

  const userId = getUserIdFromSession(session)
  if (userId == null) return apiError('Session invalide', 401)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      telephone: true,
    },
  })

  if (!user) return apiError('Utilisateur introuvable', 404)

  return apiSuccess(user)
}

export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return apiError('Non authentifié', 401)

  const userId = getUserIdFromSession(session)
  if (userId == null) return apiError('Session invalide', 401)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Body JSON invalide', 400)
  }

  const parsed = profilUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('Données invalides', 400, parsed.error.flatten())
  }

  const telephone =
    parsed.data.telephone === undefined
      ? undefined
      : parsed.data.telephone?.trim() || null

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(telephone !== undefined && { telephone }),
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      email: true,
      telephone: true,
    },
  })

  return apiSuccess(user)
}
