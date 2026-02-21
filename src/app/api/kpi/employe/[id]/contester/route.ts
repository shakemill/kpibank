import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { kpiEmployeContesterSchema } from '@/lib/validations/kpi'
import { notifierKpiConteste } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const id = parseInt((await params).id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }
  const parsed = kpiEmployeContesterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const userId = parseInt((session.user as { id?: string }).id!, 10)
  const existing = await prisma.kpiEmploye.findUnique({
    where: { id },
    select: { employeId: true, statut: true, assigneParId: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'KPI employé introuvable' }, { status: 404 })
  }
  if (existing.employeId !== userId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }
  if (existing.statut !== 'NOTIFIE') {
    return NextResponse.json(
      { error: 'Seuls les KPI notifiés peuvent être contestés' },
      { status: 400 }
    )
  }
  try {
    await prisma.kpiEmploye.update({
      where: { id },
      data: { statut: 'CONTESTE', motif_contestation: parsed.data.motif },
    })
    await notifierKpiConteste(existing.assigneParId, id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la contestation', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
