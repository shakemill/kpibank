import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma/client'

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
  const action = searchParams.get('action')?.trim() ?? ''
  const search = searchParams.get('search')?.trim() ?? ''

  const where: Prisma.AuditLogWhereInput = {}
  if (from || to) {
    where.createdAt = {}
    if (from) where.createdAt.gte = new Date(from + 'T00:00:00.000Z')
    if (to) where.createdAt.lte = new Date(to + 'T23:59:59.999Z')
  }
  if (action) {
    where.action = action
  }
  if (search) {
    where.OR = [
      { details: { contains: search, mode: 'insensitive' } },
      { entityId: { contains: search, mode: 'insensitive' } },
      { entityType: { contains: search, mode: 'insensitive' } },
      {
        user: {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { nom: { contains: search, mode: 'insensitive' } },
            { prenom: { contains: search, mode: 'insensitive' } },
          ],
        },
      },
    ]
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
