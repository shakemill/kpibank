import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireManager } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionAndRequireManager()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const employeId = parseInt((await params).id, 10)
  if (Number.isNaN(employeId)) {
    return NextResponse.json({ error: 'ID employé invalide' }, { status: 400 })
  }
  const assignateurId = parseInt((result.session!.user as { id?: string }).id!, 10)
  const employe = await prisma.user.findUnique({
    where: { id: employeId },
    select: { id: true, managerId: true, role: true },
  })
  const roleStr = (result.session!.user as { role?: string }).role ?? ''
  const peutNotifier =
    employe &&
    (employe.managerId === assignateurId ||
      (roleStr === 'DG' && employe.role === 'DIRECTEUR') ||
      employe.id === assignateurId)
  if (!peutNotifier) {
    return NextResponse.json(
      { error: 'Vous ne pouvez notifier que les KPI de vos collaborateurs directs' },
      { status: 403 }
    )
  }
  let body: { periodeId?: number }
  try {
    body = (await request.json()) as { periodeId?: number }
  } catch {
    body = {}
  }
  const periodeId = body.periodeId
  if (periodeId == null) {
    return NextResponse.json(
      { error: 'periodeId requis dans le body' },
      { status: 400 }
    )
  }

  const drafts = await prisma.kpiEmploye.findMany({
    where: { employeId, periodeId, statut: 'DRAFT' },
    select: { id: true, poids: true },
  })
  const sumPoids = drafts.reduce((s, k) => s + k.poids, 0)
  if (Math.abs(sumPoids - 100) > 0.01) {
    return NextResponse.json(
      {
        error:
          'La somme des poids des KPI en brouillon doit être 100% pour notifier',
        sumPoids,
      },
      { status: 400 }
    )
  }
  const now = new Date()
  try {
    await prisma.kpiEmploye.updateMany({
      where: { employeId, periodeId, statut: 'DRAFT' },
      data: { statut: 'NOTIFIE', date_notification: now },
    })
    return NextResponse.json({ success: true, count: drafts.length })
  } catch (e) {
    return NextResponse.json(
      {
        error: 'Erreur lors de la notification',
        details: e instanceof Error ? e.message : e,
      },
      { status: 500 }
    )
  }
}
