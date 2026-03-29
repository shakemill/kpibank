import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

/** Liste des logs d'audit (paginated). Réservé DG. */
export async function GET(request: NextRequest) {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get('pageSize') ?? '25', 10)))
  const from = searchParams.get('from') // YYYY-MM-DD
  const to = searchParams.get('to')

  const where: { createdAt?: { gte?: Date; lte?: Date } } = {}
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from + 'T00:00:00.000Z')
    if (to) where.createdAt.lte = new Date(to + 'T23:59:59.999Z')
  }

  try {
    const [list, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, nom: true, prenom: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ])
    return NextResponse.json({ list, total, page, pageSize })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
