import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { serviceUpdateSchema } from '@/lib/validations/organisation'
import { trouverChefService } from '@/lib/service-chef-utils'
import { AuditAction, auditFromRequest } from '@/lib/audit-log'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionAndRequireDG()
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
  const parsed = serviceUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  try {
    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(parsed.data.nom != null && { nom: parsed.data.nom }),
        ...(parsed.data.code != null && { code: parsed.data.code }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.directionId != null && { directionId: parsed.data.directionId }),
        ...(parsed.data.actif !== undefined && { actif: parsed.data.actif }),
      },
      include: {
        direction: { select: { id: true, nom: true, code: true } },
        responsable: { select: { id: true, nom: true, prenom: true, email: true } },
        _count: { select: { employes: true } },
      },
    })
    const chefService = await trouverChefService(service.id)
    await auditFromRequest(request, {
      userId: (result.session!.user as { id?: string }).id,
      action:
        parsed.data.actif === false
          ? AuditAction.SERVICE_DEACTIVATE
          : AuditAction.SERVICE_UPDATE,
      entityType: 'Service',
      entityId: service.id,
      details: `${service.nom} (${service.code})`,
    })
    return NextResponse.json({ ...service, chefService })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const id = parseInt((await params).id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }
  try {
    await prisma.service.update({
      where: { id },
      data: { actif: false },
    })
    await auditFromRequest(request, {
      userId: (result.session!.user as { id?: string }).id,
      action: AuditAction.SERVICE_DEACTIVATE,
      entityType: 'Service',
      entityId: id,
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la désactivation', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
