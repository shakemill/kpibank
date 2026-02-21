import { NextRequest } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { sendMail } from '@/lib/mailer'
import { getEtablissementNom } from '@/lib/etablissement'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  const result = await getSessionAndRequireDG()
  if (result.error) return apiError(result.error, result.status)
  try {
    const body = await request.json().catch(() => ({}))
    const to = typeof body.to === 'string' ? body.to.trim() : ''
    if (!to) return apiError('Champ "to" (email) requis', 400)
    const nomEtablissement = await getEtablissementNom()
    const subject = 'Test configuration email — Système KPI'
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1F4E79; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 18px;">Système KPI — ${nomEtablissement}</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #1F4E79;">Test d'envoi</h2>
          <p>Ce message confirme que la configuration SMTP du Système KPI fonctionne correctement.</p>
          <p style="color: #888; font-size: 12px;">Envoyé à ${new Date().toISOString()}</p>
        </div>
      </div>
    `
    const sendResult = await sendMail({ to, subject, html })
    if (!sendResult.success) {
      return apiError(
        'Échec envoi',
        500,
        sendResult.error instanceof Error ? sendResult.error.message : String(sendResult.error)
      )
    }
    return apiSuccess({ success: true, messageId: sendResult.messageId })
  } catch (e) {
    return apiError('Erreur test email', 500, e instanceof Error ? e.message : e)
  }
}
