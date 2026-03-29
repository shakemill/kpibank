import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSessionAndRequireManager } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { calculerPoidsRestantEmploye } from '@/lib/kpi-utils'
import { kpiEmployeUpdateSchema } from '@/lib/validations/kpi'

const MANAGER_ROLES = ['MANAGER', 'DG', 'DIRECTEUR', 'CHEF_SERVICE']

async function getKpiAndScope(kpiEmployeId: number) {
  const kpi = await prisma.kpiEmploye.findUnique({
    where: { id: kpiEmployeId },
    select: {
      id: true,
      employeId: true,
      assigneParId: true,
      periodeId: true,
      poids: true,
      statut: true,
      periode: { select: { statut: true } },
      _count: { select: { saisiesMensuelles: true } },
    },
  })
  return kpi
}

export async function PUT(
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
  const parsed = kpiEmployeUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const existing = await getKpiAndScope(id)
  if (!existing) {
    return NextResponse.json({ error: 'KPI employé introuvable' }, { status: 404 })
  }
  const userId = parseInt((session.user as { id?: string }).id!, 10)
  const role = (session.user as { role?: string }).role ?? ''
  const isManager = MANAGER_ROLES.includes(role) && existing.assigneParId === userId
  const isEmploye = role === 'EMPLOYE' && existing.employeId === userId
  if (!isManager && !isEmploye) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }
  if (parsed.data.poids != null) {
    const poidsRestant = await calculerPoidsRestantEmploye(
      existing.employeId,
      existing.periodeId,
      id
    )
    if (parsed.data.poids > poidsRestant) {
      return NextResponse.json(
        { error: 'La somme des poids dépasserait 100%', poidsRestant },
        { status: 400 }
      )
    }
  }
  try {
    const kpi = await prisma.kpiEmploye.update({
      where: { id },
      data: {
        ...(parsed.data.cible !== undefined && { cible: parsed.data.cible }),
        ...(parsed.data.poids !== undefined && { poids: parsed.data.poids }),
      },
      include: {
        catalogueKpi: true,
        kpiService: { include: { catalogueKpi: { select: { nom: true } } } },
        periode: { select: { id: true, code: true, statut: true } },
        employe: { select: { id: true, nom: true, prenom: true } },
        assignePar: { select: { id: true, nom: true, prenom: true } },
      },
    })
    return NextResponse.json(kpi)
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
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
  const existing = await getKpiAndScope(id)
  if (!existing) {
    return NextResponse.json({ error: 'KPI employé introuvable' }, { status: 404 })
  }
  const managerId = parseInt((result.session!.user as { id?: string }).id!, 10)
  if (existing.assigneParId !== managerId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }
  const periodeStatut = existing.periode?.statut
  if (periodeStatut === 'EN_COURS' || periodeStatut === 'CLOTUREE') {
    return NextResponse.json(
      { error: 'Impossible de supprimer un KPI dont la période est en cours ou clôturée.' },
      { status: 400 }
    )
  }
  if (existing.statut !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Impossible de supprimer un KPI déjà notifié ou renseigné.' },
      { status: 400 }
    )
  }
  if (existing._count?.saisiesMensuelles != null && existing._count.saisiesMensuelles > 0) {
    return NextResponse.json(
      { error: 'Impossible de supprimer un KPI qui possède déjà des saisies.' },
      { status: 400 }
    )
  }
  try {
    await prisma.kpiEmploye.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la suppression', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
