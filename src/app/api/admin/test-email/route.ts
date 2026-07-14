import { NextRequest } from 'next/server'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import { sendMail } from '@/lib/mailer'
import { getEtablissementEmailBrand } from '@/lib/etablissement'
import { templateTestEmail } from '@/lib/email-templates'
import { apiSuccess, apiError } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  const result = await getSessionAndRequireDG()
  if (result.error) return apiError(result.error, result.status)
  try {
    const body = await request.json().catch(() => ({}))
    const to = typeof body.to === 'string' ? body.to.trim() : ''
    if (!to) return apiError('Champ "to" (email) requis', 400)
    const brand = await getEtablissementEmailBrand()
    const subject = 'Test configuration email — Système KPI'
    const html = templateTestEmail(brand)
    const sendResult = await sendMail({ to, subject, html })
    if (!sendResult.success) {
      const errMsg = sendResult.error instanceof Error ? sendResult.error.message : String(sendResult.error)
      return apiError('Échec envoi : ' + errMsg, 500, sendResult.error)
    }
    return apiSuccess({ success: true, messageId: sendResult.messageId })
  } catch (e) {
    return apiError('Erreur test email', 500, e instanceof Error ? e.message : e)
  }
}
