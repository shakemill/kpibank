import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { userUpdateSchema } from '@/lib/validations/organisation'
import {
  synchroniserResponsableApresUtilisateur,
  validerDirecteurDirection,
} from '@/lib/directeur-adjoint-utils'
import {
  synchroniserResponsableApresUtilisateurService,
  validerChefService,
} from '@/lib/service-chef-utils'
import { normaliserRattachementUtilisateur } from '@/lib/user-org-utils'
import { AuditAction, auditFromRequest } from '@/lib/audit-log'
import bcrypt from 'bcryptjs'

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
  const parsed = userUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const data: Record<string, unknown> = {}
  if (parsed.data.nom != null) data.nom = parsed.data.nom
  if (parsed.data.prenom !== undefined) data.prenom = parsed.data.prenom?.trim() || ''
  if (parsed.data.email != null) data.email = parsed.data.email.trim().toLowerCase()
  if (parsed.data.telephone !== undefined) data.telephone = parsed.data.telephone
  if (parsed.data.posteOccupe !== undefined) {
    data.posteOccupe = parsed.data.posteOccupe?.trim() || null
  }
  if (parsed.data.role != null) data.role = parsed.data.role
  if (parsed.data.directionId !== undefined) data.directionId = parsed.data.directionId
  if (parsed.data.serviceId !== undefined) data.serviceId = parsed.data.serviceId
  if (parsed.data.managerId !== undefined) data.managerId = parsed.data.managerId
  if (parsed.data.actif !== undefined) data.actif = parsed.data.actif
  if (parsed.data.password != null && parsed.data.password.length >= 8) {
    data.password = await bcrypt.hash(parsed.data.password, 10)
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { role: true, directionId: true, serviceId: true, posteOccupe: true },
  })
  if (!existing) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  }

  const mergedRole = (parsed.data.role ?? existing.role) as string
  const mergedDirectionId =
    parsed.data.directionId !== undefined ? parsed.data.directionId : existing.directionId
  const mergedServiceId =
    parsed.data.serviceId !== undefined ? parsed.data.serviceId : existing.serviceId
  const mergedPosteOccupe =
    parsed.data.posteOccupe !== undefined ? parsed.data.posteOccupe : existing.posteOccupe

  const rattachement = normaliserRattachementUtilisateur({
    role: mergedRole,
    directionId: mergedDirectionId,
    serviceId: mergedServiceId,
  })
  if (
    parsed.data.directionId !== undefined ||
    parsed.data.serviceId !== undefined ||
    parsed.data.role != null
  ) {
    data.directionId = rattachement.directionId
    data.serviceId = rattachement.serviceId
  }

  const validationDirecteur = await validerDirecteurDirection({
    userId: id,
    role: mergedRole,
    directionId: rattachement.directionId,
    posteOccupe: mergedPosteOccupe,
  })
  if (!validationDirecteur.ok) {
    return NextResponse.json({ error: validationDirecteur.error }, { status: 400 })
  }

  const validationChef = await validerChefService({
    userId: id,
    role: mergedRole,
    serviceId: rattachement.serviceId,
  })
  if (!validationChef.ok) {
    return NextResponse.json({ error: validationChef.error }, { status: 400 })
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      include: {
        service: { select: { id: true, nom: true, code: true } },
        direction: { select: { id: true, nom: true, code: true } },
        manager: { select: { id: true, nom: true, prenom: true, email: true } },
      },
    })

    await synchroniserResponsableApresUtilisateur({
      userId: user.id,
      role: user.role,
      directionId: user.directionId,
      posteOccupe: user.posteOccupe,
      previousDirectionId: existing.directionId,
    })

    await synchroniserResponsableApresUtilisateurService({
      userId: user.id,
      role: user.role,
      serviceId: user.serviceId,
      previousServiceId: existing.serviceId,
    })

    await auditFromRequest(request, {
      userId: (result.session!.user as { id?: string }).id,
      action: AuditAction.USER_UPDATE,
      entityType: 'User',
      entityId: user.id,
      details: `${user.email} · ${user.role}`,
    })

    return NextResponse.json({ ...user, password: undefined })
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
  const currentUserIdRaw = (result.session!.user as { id?: number | string }).id
  const currentUserId = typeof currentUserIdRaw === 'string' ? parseInt(currentUserIdRaw, 10) : currentUserIdRaw
  if (!Number.isNaN(currentUserId) && currentUserId === id) {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas supprimer votre propre compte.' },
      { status: 400 }
    )
  }
  try {
    await prisma.user.delete({ where: { id } })
    await auditFromRequest(request, {
      userId: currentUserId,
      action: AuditAction.USER_DELETE,
      entityType: 'User',
      entityId: id,
    })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const prismaError = e as { code?: string }
    if (prismaError?.code === 'P2003' || (e instanceof Error && e.message?.includes('Foreign key'))) {
      return NextResponse.json(
        {
          error: 'Impossible de supprimer cet utilisateur : des données lui sont rattachées (KPI créés, assignations, paramètres modifiés, etc.). Désactivez-le à la place.',
        },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Erreur lors de la suppression', details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
