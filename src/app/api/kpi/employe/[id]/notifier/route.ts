import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireManager } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { peutAssignerA } from '@/lib/assignation-rules'
import { formaterNomKpiAffichage } from '@/lib/kpi-cible-utils'
import { notifierKpisEmploye } from '@/lib/notifications'
import { AuditAction, auditFromRequest } from '@/lib/audit-log'

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
  const sessionUser = result.session!.user as {
    id?: string
    role?: string
    serviceId?: number | null
    directionId?: number | null
  }
  const assignateurId = parseInt(sessionUser.id ?? '', 10)
  if (Number.isNaN(assignateurId)) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }
  const peutNotifier = await peutAssignerA(
    {
      id: assignateurId,
      role: sessionUser.role ?? '',
      serviceId: sessionUser.serviceId ?? null,
      directionId: sessionUser.directionId ?? null,
    },
    employeId
  )
  if (!peutNotifier) {
    return NextResponse.json(
      { error: "Vous n'êtes pas autorisé à notifier les KPI de cet utilisateur" },
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

  const [drafts, periode, assignateur, employe] = await Promise.all([
    prisma.kpiEmploye.findMany({
      where: { employeId, periodeId, statut: 'DRAFT' },
      select: {
        id: true,
        poids: true,
        cible: true,
        kpiServiceId: true,
        catalogueKpi: { select: { nom: true, unite: true } },
      },
    }),
    prisma.periode.findUnique({
      where: { id: periodeId },
      select: { code: true },
    }),
    prisma.user.findUnique({
      where: { id: assignateurId },
      select: { prenom: true, nom: true, role: true },
    }),
    prisma.user.findUnique({
      where: { id: employeId },
      select: { id: true },
    }),
  ])

  if (!periode) {
    return NextResponse.json({ error: 'Période introuvable' }, { status: 404 })
  }
  if (!employe) {
    return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 })
  }
  if (drafts.length === 0) {
    return NextResponse.json(
      { error: 'Aucun KPI en brouillon à notifier' },
      { status: 400 }
    )
  }
  const requiresPoidsSum = drafts.some((k) => k.kpiServiceId != null)
  const sumPoids = drafts.reduce((s, k) => s + k.poids, 0)
  if (requiresPoidsSum && Math.abs(sumPoids - 100) > 0.01) {
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

    const assignateurNom = assignateur
      ? `${assignateur.prenom} ${assignateur.nom}`.trim()
      : 'Votre manager'
    const kpisRecap = drafts.map((k) => ({
      nom: formaterNomKpiAffichage(k.catalogueKpi.nom),
      cible: k.cible,
      unite: k.catalogueKpi.unite,
      poids: k.poids,
    }))

    await notifierKpisEmploye(
      employeId,
      assignateurNom,
      assignateur?.role ?? sessionUser.role ?? '',
      periode.code,
      kpisRecap
    )

    await auditFromRequest(request, {
      userId: sessionUser.id,
      action: AuditAction.KPI_NOTIFY,
      entityType: 'KpiEmploye',
      entityId: employeId,
      details: `periodeId=${periodeId} · count=${drafts.length}`,
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
