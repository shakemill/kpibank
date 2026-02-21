import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: NextRequest,
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
  const userId = parseInt((session.user as { id?: string }).id!, 10)
  const existing = await prisma.kpiEmploye.findUnique({
    where: { id },
    select: { employeId: true, statut: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'KPI employé introuvable' }, { status: 404 })
  }
  if (existing.employeId !== userId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }
  if (existing.statut !== 'NOTIFIE') {
    return NextResponse.json(
      { error: 'Seuls les KPI notifiés peuvent être acceptés' },
      { status: 400 }
    )
  }
  const now = new Date()
  try {
    await prisma.kpiEmploye.update({
      where: { id },
      data: { statut: 'VALIDE', date_acceptation: now },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de l\'acceptation', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
