import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: process.env.MAIL_ENCRYPTION === 'ssl',
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
})

export async function sendMail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text?: string
}) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]*>/g, ''),
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
