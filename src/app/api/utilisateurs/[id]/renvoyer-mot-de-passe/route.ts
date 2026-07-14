import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mailer'
import { getEtablissementEmailBrand } from '@/lib/etablissement'
import { templateRenvoiMotDePasse } from '@/lib/email-templates'
import { generateRandomPassword } from '@/lib/password-utils'
import bcrypt from 'bcryptjs'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const id = parseInt((await params).id, 10)
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, nom: true, prenom: true, email: true, actif: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  }

  if (!user.actif) {
    return NextResponse.json(
      { error: 'Impossible d\'envoyer un mot de passe à un utilisateur inactif.' },
      { status: 400 },
    )
  }

  const tempPassword = generateRandomPassword()
  const hashedPassword = await bcrypt.hash(tempPassword, 10)

  try {
    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        force_password_change: true,
      },
    })

    const brand = await getEtablissementEmailBrand()
    await sendMail({
      to: user.email,
      subject: `Système KPI — Nouveau mot de passe`,
      html: templateRenvoiMotDePasse(
        brand,
        user.prenom,
        user.email,
        tempPassword,
      ),
    })

    return NextResponse.json({
      success: true,
      message: `Un nouveau mot de passe a été envoyé à ${user.email}.`,
    })
  } catch (e) {
    console.error('[UTILISATEURS] Erreur renvoi mot de passe:', e)
    return NextResponse.json(
      {
        error: 'Erreur lors de l\'envoi de l\'email',
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    )
  }
}
