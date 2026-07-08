import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { serviceCreateSchema } from '@/lib/validations/organisation'
import { trouverChefService } from '@/lib/service-chef-utils'

export async function GET(request: NextRequest) {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { searchParams } = new URL(request.url)
  const directionId = searchParams.get('directionId')
  const actifParam = searchParams.get('actif')
  const where: { directionId?: number; actif?: boolean } = directionId
    ? { directionId: parseInt(directionId, 10) }
    : {}
  if (actifParam === 'true') where.actif = true
  else if (actifParam === 'false') where.actif = false
  try {
    const services = await prisma.service.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: {
        direction: { select: { id: true, nom: true, code: true } },
        responsable: { select: { id: true, nom: true, prenom: true, email: true } },
        _count: { select: { employes: true } },
      },
      orderBy: { nom: 'asc' },
    })
    const chefs = await prisma.user.findMany({
      where: {
        role: 'CHEF_SERVICE',
        actif: true,
        serviceId: { in: services.map((s) => s.id) },
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        posteOccupe: true,
        serviceId: true,
      },
    })
    const chefParService = new Map<number, (typeof chefs)[number]>()
    for (const chef of chefs) {
      if (chef.serviceId != null && !chefParService.has(chef.serviceId)) {
        chefParService.set(chef.serviceId, chef)
      }
    }
    return NextResponse.json(
      services.map((service) => ({
        ...service,
        chefService: chefParService.get(service.id) ?? null,
      })),
    )
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }
  const parsed = serviceCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  try {
    const service = await prisma.service.create({
      data: {
        nom: parsed.data.nom,
        code: parsed.data.code,
        description: parsed.data.description ?? undefined,
        directionId: parsed.data.directionId,
      },
      include: {
        direction: { select: { id: true, nom: true, code: true } },
        responsable: { select: { id: true, nom: true, prenom: true, email: true } },
        _count: { select: { employes: true } },
      },
    })
    const chefService = await trouverChefService(service.id)
    return NextResponse.json({ ...service, chefService })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la création', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
