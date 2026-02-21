import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { consolidateDirection } from '@/lib/consolidation'
import { apiSuccess, apiError } from '@/lib/api-response'

function checkCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get('x-cron-secret') ?? request.headers.get('authorization')
  if (header?.startsWith('Bearer ')) return header.slice(7) === secret
  return header === secret
}

export async function GET(request: Request) {
  if (!checkCronSecret(request)) return apiError('Unauthorized', 401)

  const periodes = await prisma.periode.findMany({
    where: { statut: 'EN_COURS', actif: true },
    select: { id: true },
  })

  const directions = await prisma.direction.findMany({
    where: { actif: true },
    select: { id: true },
  })

  let errors: string[] = []
  for (const periode of periodes) {
    for (const dir of directions) {
      try {
        await consolidateDirection(dir.id, periode.id)
      } catch (e) {
        errors.push(
          `periode=${periode.id} direction=${dir.id}: ${e instanceof Error ? e.message : String(e)}`
        )
      }
    }
  }

  if (errors.length > 0) {
    console.error('[cron/consolidation]', new Date().toISOString(), 'errors:', errors)
  } else {
    console.log(
      `[cron/consolidation] ${new Date().toISOString()} periodes=${periodes.length} directions=${directions.length} ok`
    )
  }

  return apiSuccess({
    ok: true,
    periodes: periodes.length,
    directions: directions.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
