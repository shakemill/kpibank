import { NextResponse } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { verifyMailer } from '@/lib/mailer'

/**
 * Vérifie la connexion SMTP et retourne un diagnostic.
 */
export async function GET() {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const config = {
    host: process.env.MAIL_HOST ?? '(non défini)',
    port: process.env.MAIL_PORT ?? '(non défini)',
    user: process.env.MAIL_USERNAME ? `${process.env.MAIL_USERNAME.substring(0, 3)}***` : '(non défini)',
    from: process.env.MAIL_FROM_ADDRESS ?? '(non défini)',
  }
  try {
    const ok = await verifyMailer()
    return NextResponse.json({
      success: ok,
      config,
      message: ok ? 'Connexion SMTP OK' : 'Échec de vérification',
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const stack = e instanceof Error ? e.stack : undefined
    return NextResponse.json(
      {
        success: false,
        config,
        error: message,
        details: stack,
      },
      { status: 500 }
    )
  }
}
