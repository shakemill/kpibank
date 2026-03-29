import { NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

/** Supprime les logs d'audit de plus d'un an. Réservé DG. */
export async function POST() {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  try {
    const deleted = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: oneYearAgo } },
    })
    return NextResponse.json({ deleted: deleted.count, before: oneYearAgo.toISOString() })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la purge', details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
