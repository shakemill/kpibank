import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { userUpdateSchema } from '@/lib/validations/organisation'
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
  if (parsed.data.prenom != null) data.prenom = parsed.data.prenom
  if (parsed.data.email != null) data.email = parsed.data.email.trim().toLowerCase()
  if (parsed.data.telephone !== undefined) data.telephone = parsed.data.telephone
  if (parsed.data.role != null) data.role = parsed.data.role
  if (parsed.data.directionId !== undefined) data.directionId = parsed.data.directionId
  if (parsed.data.serviceId !== undefined) data.serviceId = parsed.data.serviceId
  if (parsed.data.managerId !== undefined) data.managerId = parsed.data.managerId
  if (parsed.data.actif !== undefined) data.actif = parsed.data.actif
  if (parsed.data.password != null && parsed.data.password.length >= 8) {
    data.password = await bcrypt.hash(parsed.data.password, 10)
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
    return NextResponse.json({ ...user, password: undefined })
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
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const id = parseInt((await params).id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }
  try {
    await prisma.user.update({
      where: { id },
      data: { actif: false },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la désactivation', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
