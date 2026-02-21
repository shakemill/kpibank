import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireManager } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { kpiEmployeRepondreContestationSchema } from '@/lib/validations/kpi'
import { notifierEmployeReponseContestation } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionAndRequireManager()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
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
  const parsed = kpiEmployeRepondreContestationSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const managerId = parseInt((result.session!.user as { id?: string }).id!, 10)
  const existing = await prisma.kpiEmploye.findUnique({
    where: { id },
    select: { assigneParId: true, statut: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'KPI employé introuvable' }, { status: 404 })
  }
  if (existing.assigneParId !== managerId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }
  if (existing.statut !== 'CONTESTE') {
    return NextResponse.json(
      { error: 'Seuls les KPI contestés peuvent recevoir une réponse' },
      { status: 400 }
    )
  }
  const newStatut = parsed.data.action === 'MAINTENU' ? ('MAINTENU' as const) : ('REVISE' as const)
  const updateData: {
    statut: 'MAINTENU' | 'REVISE'
    reponse_contestation: string
    cible?: number
    poids?: number
  } = {
    statut: newStatut,
    reponse_contestation: parsed.data.reponse_contestation,
  }
  if (parsed.data.action === 'REVISE') {
    if (parsed.data.cible !== undefined) updateData.cible = parsed.data.cible
    if (parsed.data.poids !== undefined) updateData.poids = parsed.data.poids
  }
  try {
    const kpi = await prisma.kpiEmploye.update({
      where: { id },
      data: updateData,
      include: {
        catalogueKpi: true,
        employe: { select: { id: true, nom: true, prenom: true } },
        assignePar: { select: { id: true, nom: true, prenom: true } },
      },
    })
    await notifierEmployeReponseContestation(kpi.employe.id, id, newStatut)
    return NextResponse.json(kpi)
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la réponse', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
