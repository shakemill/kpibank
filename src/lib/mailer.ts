import nodemailer from 'nodemailer'
import { getEmailLogoAttachment } from '@/lib/etablissement'

const mailPort = Number(process.env.MAIL_PORT) || 465
const useSecure = (process.env.MAIL_ENCRYPTION ?? 'ssl').toLowerCase() === 'ssl' || mailPort === 465

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: mailPort,
  secure: useSecure,
  auth: process.env.MAIL_USERNAME
    ? {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      }
    : undefined,
  tls: {
    rejectUnauthorized: false,
  },
})

export async function sendMail({
  to,
  subject,
  html,
  text,
  attachments,
}: {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: nodemailer.SendMailOptions['attachments']
}) {
  try {
    const needsLogo = html.includes('cid:etablissement-logo')
    const logoAttachment = needsLogo ? await getEmailLogoAttachment() : null
    const allAttachments = [
      ...(logoAttachment
        ? [
            {
              filename: logoAttachment.filename,
              path: logoAttachment.path,
              cid: logoAttachment.cid,
              contentDisposition: logoAttachment.contentDisposition as 'inline',
              contentType: logoAttachment.contentType,
            },
          ]
        : []),
      ...(attachments ?? []),
    ]

    const info = await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]*>/g, ''),
      attachments: allAttachments.length > 0 ? allAttachments : undefined,
    })
    console.log(`[MAILER] Email envoyé à ${to} — MessageId: ${info.messageId}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error(`[MAILER] Erreur envoi email à ${to}:`, error)
    return { success: false, error }
  }
}

export async function verifyMailer() {
  try {
    await transporter.verify()
    console.log('[MAILER] Connexion SMTP OK')
    return true
  } catch (error) {
    console.error('[MAILER] Connexion SMTP échouée:', error)
    return false
  }
}
