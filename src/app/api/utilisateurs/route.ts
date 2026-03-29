import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { userCreateSchema } from '@/lib/validations/organisation'
import { sendMail } from '@/lib/mailer'
import { getEtablissementNom } from '@/lib/etablissement'
import { templateNouveauCompte } from '@/lib/email-templates'
import bcrypt from 'bcryptjs'

function randomPassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!'
  let s = ''
  for (let i = 0; i < length; i++) s += chars.charAt(Math.floor(Math.random() * chars.length))
  return s
}

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

  const where: {
    role?: string
    directionId?: number
    actif?: boolean
    OR?: { nom?: { contains: string; mode: 'insensitive' }; prenom?: { contains: string; mode: 'insensitive' }; email?: { contains: string; mode: 'insensitive' } }[]
  } = {}
  if (role) where.role = role
  if (directionId) where.directionId = parseInt(directionId, 10)
  if (actif !== null && actif !== undefined && actif !== '') {
    where.actif = actif === 'true'
  }
  if (search.length > 0) {
    const term = search
    where.OR = [
      { nom: { contains: term, mode: 'insensitive' } },
      { prenom: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
    ]
  }
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
  const tempPassword = randomPassword()
  const hashedPassword = await bcrypt.hash(tempPassword, 10)
  try {
    const user = await prisma.user.create({
      data: {
        nom: parsed.data.nom,
        prenom: parsed.data.prenom,
        email: parsed.data.email.trim().toLowerCase(),
        telephone: parsed.data.telephone ?? undefined,
        password: hashedPassword,
        role: parsed.data.role,
        directionId: parsed.data.directionId ?? undefined,
        serviceId: parsed.data.serviceId ?? undefined,
        managerId: parsed.data.managerId ?? undefined,
      },
      include: {
        service: { select: { id: true, nom: true, code: true } },
        direction: { select: { id: true, nom: true, code: true } },
        manager: { select: { id: true, nom: true, prenom: true, email: true } },
      },
    })

    try {
      const nomEtablissement = await getEtablissementNom()
      const emailHtml = templateNouveauCompte(
        nomEtablissement,
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
