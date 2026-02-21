import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Route de diagnostic : vérifie que l'app voit des utilisateurs en base.
 * À supprimer ou protéger en production.
 * GET /api/debug-auth → { userCount, sampleEmails }
 */
export async function GET() {
  try {
    const userCount = await prisma.user.count()
    const sample = await prisma.user.findMany({
      take: 3,
      select: { email: true, role: true, actif: true },
    })
    return NextResponse.json({
      ok: true,
      userCount,
      sampleEmails: sample.map((u) => ({ email: u.email, role: u.role, actif: u.actif })),
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
