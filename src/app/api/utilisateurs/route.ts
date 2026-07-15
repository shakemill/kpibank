import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import type { Prisma, Role } from '@/generated/prisma/client'
import { userCreateSchema } from '@/lib/validations/organisation'
import { sendMail } from '@/lib/mailer'
import { getEtablissementEmailBrand } from '@/lib/etablissement'
import { templateNouveauCompte } from '@/lib/email-templates'
import { generateRandomPassword } from '@/lib/password-utils'
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

export async function GET(request: NextRequest) {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  const directionId = searchParams.get('directionId')
  const actif = searchParams.get('actif')
  const search = searchParams.get('search')?.trim() ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(50, Math.max(6, parseInt(searchParams.get('pageSize') ?? '12', 10)))

  const andConditions: Prisma.UserWhereInput[] = []

  if (role) andConditions.push({ role: role as Role })
  if (actif !== null && actif !== undefined && actif !== '') {
    andConditions.push({ actif: actif === 'true' })
  }
  if (directionId) {
    const dirId = parseInt(directionId, 10)
    if (!Number.isNaN(dirId)) {
      andConditions.push({
        OR: [
          { directionId: dirId },
          { service: { directionId: dirId } },
        ],
      })
    }
  }
  if (search.length > 0) {
    andConditions.push({
      OR: [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    })
  }

  const where: Prisma.UserWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {}

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          service: { select: { id: true, nom: true, code: true } },
          direction: { select: { id: true, nom: true, code: true } },
          manager: { select: { id: true, nom: true, prenom: true, email: true } },
        },
        orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ])
    return NextResponse.json({
      list: users.map((u) => ({ ...u, password: undefined })),
      total,
      page,
      pageSize,
    })
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
  const parsed = userCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const tempPassword = generateRandomPassword()
  const hashedPassword = await bcrypt.hash(tempPassword, 10)

  const rattachement = normaliserRattachementUtilisateur({
    role: parsed.data.role,
    directionId: parsed.data.directionId ?? null,
    serviceId: parsed.data.serviceId ?? null,
  })

  const validationDirecteur = await validerDirecteurDirection({
    role: parsed.data.role,
    directionId: rattachement.directionId,
    posteOccupe: parsed.data.posteOccupe ?? null,
  })
  if (!validationDirecteur.ok) {
    return NextResponse.json({ error: validationDirecteur.error }, { status: 400 })
  }

  const validationChef = await validerChefService({
    role: parsed.data.role,
    serviceId: rattachement.serviceId,
  })
  if (!validationChef.ok) {
    return NextResponse.json({ error: validationChef.error }, { status: 400 })
  }

  try {
    const user = await prisma.user.create({
      data: {
        nom: parsed.data.nom,
        prenom: parsed.data.prenom?.trim() || '',
        email: parsed.data.email.trim().toLowerCase(),
        telephone: parsed.data.telephone ?? undefined,
        posteOccupe: parsed.data.posteOccupe?.trim() || undefined,
        password: hashedPassword,
        role: parsed.data.role,
        directionId: rattachement.directionId ?? undefined,
        serviceId: rattachement.serviceId ?? undefined,
        managerId: parsed.data.managerId ?? undefined,
      },
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
    })

    await synchroniserResponsableApresUtilisateurService({
      userId: user.id,
      role: user.role,
      serviceId: user.serviceId,
    })

    try {
      const brand = await getEtablissementEmailBrand()
      const emailHtml = templateNouveauCompte(
        brand,
        user.prenom,
        user.email,
        tempPassword
      )
      await sendMail({
        to: user.email,
        subject: `Système KPI — Votre compte utilisateur`,
        html: emailHtml,
      })
    } catch (mailErr) {
      console.error('[UTILISATEURS] Erreur envoi email nouveau compte:', mailErr)
    }

    await auditFromRequest(request, {
      userId: (result.session!.user as { id?: string }).id,
      action: AuditAction.USER_CREATE,
      entityType: 'User',
      entityId: user.id,
      details: `${user.email} · ${user.role}`,
    })

    return NextResponse.json({
      ...user,
      password: undefined,
      tempPassword,
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la création', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
