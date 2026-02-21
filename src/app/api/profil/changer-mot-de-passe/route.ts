import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { apiSuccess, apiError } from '@/lib/api-response'

const NOUVEAU_MOT_DE_PASSE_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/

export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return apiError('Non authentifié', 401)
  const userId = parseInt((session.user as { id?: string }).id ?? '', 10)
  if (Number.isNaN(userId)) return apiError('Session invalide', 401)

  let body: { ancienMotDePasse?: string; nouveauMotDePasse?: string; confirmation?: string }
  try {
    body = await request.json()
  } catch {
    return apiError('Body JSON invalide', 400)
  }

  const ancien = typeof body.ancienMotDePasse === 'string' ? body.ancienMotDePasse : ''
  const nouveau = typeof body.nouveauMotDePasse === 'string' ? body.nouveauMotDePasse.trim() : ''
  const confirmation = typeof body.confirmation === 'string' ? body.confirmation.trim() : ''

  if (!ancien) return apiError('Ancien mot de passe requis', 400)
  if (!nouveau) return apiError('Nouveau mot de passe requis', 400)
  if (nouveau.length < 8) return apiError('Le nouveau mot de passe doit contenir au moins 8 caractères', 400)
  if (!NOUVEAU_MOT_DE_PASSE_REGEX.test(nouveau)) {
    return apiError('Le nouveau mot de passe doit contenir au moins une majuscule et un chiffre', 400)
  }
  if (nouveau !== confirmation) return apiError('La confirmation ne correspond pas au nouveau mot de passe', 400)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  })
  if (!user) return apiError('Utilisateur introuvable', 404)

  const valid = await bcrypt.compare(ancien, user.password)
  if (!valid) return apiError('Ancien mot de passe incorrect', 403)

  const hash = await bcrypt.hash(nouveau, 10)
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hash,
      force_password_change: false,
    },
  })

  return apiSuccess({ ok: true })
}
