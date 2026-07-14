import type { EtablissementEmailBrand } from '@/lib/etablissement'

const baseUrl = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')

const COLORS = {
  pageBg: '#f3f4f6',
  cardBg: '#ffffff',
  text: '#1f2937',
  muted: '#6b7280',
  border: '#e5e7eb',
  primary: '#1F4E79',
  primaryBtn: '#1F4E79',
  danger: '#b91c1c',
  dangerBg: '#fef2f2',
  softBg: '#f8fafc',
}

export type EmailBrand = EtablissementEmailBrand | string

function resolveBrand(brand: EmailBrand): EtablissementEmailBrand {
  if (typeof brand === 'string') return { nom: brand, logoUrl: null }
  return { nom: brand.nom, logoUrl: brand.logoUrl ?? null }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function ctaButton(href: string, label: string, variant: 'primary' | 'danger' = 'primary'): string {
  const bg = variant === 'danger' ? COLORS.danger : COLORS.primaryBtn
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px auto 8px;">
      <tr>
        <td style="border-radius: 6px; background: ${bg};">
          <a href="${href}"
             style="display: inline-block; padding: 12px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; letter-spacing: 0.01em;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>
  `
}

function infoCard(innerHtml: string, accent: string = COLORS.primary): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="background: ${COLORS.softBg}; border: 1px solid ${COLORS.border}; border-left: 3px solid ${accent}; border-radius: 6px; padding: 16px 18px;">
          ${innerHtml}
        </td>
      </tr>
    </table>
  `
}

/**
 * Enveloppe commune : fond gris clair, carte blanche, logo sur bandeau blanc, style professionnel épuré.
 */
export function wrapEmailLayout(
  brandInput: EmailBrand,
  opts: {
    title: string
    bodyHtml: string
    footerNote?: string
    preheader?: string
  }
): string {
  const brand = resolveBrand(brandInput)
  const nom = escapeHtml(brand.nom)
  const title = escapeHtml(opts.title)
  const footer =
    opts.footerNote ??
    'Cet e-mail est envoyé automatiquement par le Système KPI. Merci de ne pas y répondre.'
  const preheader = opts.preheader
    ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(opts.preheader)}</div>`
    : ''

  const logoBlock = brand.logoUrl
    ? `<img src="${brand.logoUrl.startsWith('cid:') ? brand.logoUrl : escapeHtml(brand.logoUrl)}" alt="${nom}" width="160" height="56" style="display:block;margin:0 auto;max-width:160px;max-height:56px;width:auto;height:auto;border:0;outline:none;text-decoration:none;" />`
    : `<p style="margin:0;font-size:18px;font-weight:700;color:${COLORS.primary};letter-spacing:-0.02em;">${nom}</p>`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.pageBg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.pageBg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${COLORS.cardBg};border-radius:10px;overflow:hidden;border:1px solid ${COLORS.border};box-shadow:0 1px 2px rgba(16,24,40,0.04);">
          <!-- Header logo -->
          <tr>
            <td align="center" style="background:#ffffff;padding:28px 32px 20px;border-bottom:1px solid ${COLORS.border};">
              ${logoBlock}
              <p style="margin:12px 0 0;font-size:12px;line-height:1.4;color:${COLORS.muted};letter-spacing:0.04em;text-transform:uppercase;">
                Système KPI · ${nom}
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 36px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:${COLORS.text};">
              <h1 style="margin:0 0 18px;font-size:20px;line-height:1.35;font-weight:700;color:${COLORS.primary};letter-spacing:-0.01em;">
                ${title}
              </h1>
              ${opts.bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:18px 36px 24px;background:#fafafa;border-top:1px solid ${COLORS.border};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:${COLORS.muted};text-align:center;">
                ${escapeHtml(footer)}
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          ${nom}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export type KpiRecapEmailRow = {
  nom: string
  cible: number
  unite: string | null
  poids: number
}

export function templateRappelSaisie(
  brand: EmailBrand,
  prenom: string,
  mois: string,
  dateLimite: string
) {
  return wrapEmailLayout(brand, {
    title: `Rappel : saisie KPI de ${mois}`,
    preheader: `Saisissez vos KPI avant le ${dateLimite}`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${escapeHtml(prenom)}</strong>,</p>
      <p style="margin:0 0 12px;">Vous avez jusqu'au <strong>${escapeHtml(dateLimite)}</strong> pour saisir vos réalisations KPI du mois de <strong>${escapeHtml(mois)}</strong>.</p>
      <p style="margin:0;">Merci de vous connecter dès que possible pour éviter que vos saisies soient marquées comme manquantes.</p>
      ${ctaButton(`${baseUrl}/saisie`, 'Accéder à ma saisie')}
    `,
  })
}

export function templateKpiNotifie(
  brand: EmailBrand,
  prenom: string,
  managerNom: string,
  periodeCode: string,
  kpis: KpiRecapEmailRow[]
) {
  const nombreKpi = kpis.length
  const afficherPoids = kpis.some((k) => k.poids > 0)
  const lignesKpi = kpis
    .map((k) => {
      const cibleLabel = `${Number(k.cible).toFixed(1)}${k.unite ? ` ${escapeHtml(k.unite)}` : ''}`
      const poidsCell = afficherPoids
        ? `<td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};text-align:right;color:${COLORS.text};">${k.poids > 0 ? `${k.poids}%` : '—'}</td>`
        : ''
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};color:${COLORS.text};">${escapeHtml(k.nom)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};text-align:right;color:${COLORS.text};">${cibleLabel}</td>
          ${poidsCell}
        </tr>
      `
    })
    .join('')

  const colonnePoids = afficherPoids
    ? `<th style="padding:10px 12px;text-align:right;border-bottom:2px solid ${COLORS.border};color:${COLORS.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">Poids</th>`
    : ''

  return wrapEmailLayout(brand, {
    title: 'Vos KPI ont été assignés',
    preheader: `${nombreKpi} KPI pour ${periodeCode}`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${escapeHtml(prenom)}</strong>,</p>
      <p style="margin:0 0 12px;"><strong>${escapeHtml(managerNom)}</strong> vous a assigné
         <strong>${nombreKpi} KPI</strong> pour la période
         <strong>${escapeHtml(periodeCode)}</strong>.</p>
      <p style="margin:0 0 8px;">Voici le récapitulatif de vos objectifs. Veuillez les accepter ou les contester dans les 3 jours.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0 8px;font-size:14px;border:1px solid ${COLORS.border};border-radius:6px;overflow:hidden;">
        <thead>
          <tr style="background:${COLORS.softBg};">
            <th style="padding:10px 12px;text-align:left;border-bottom:2px solid ${COLORS.border};color:${COLORS.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">Indicateur</th>
            <th style="padding:10px 12px;text-align:right;border-bottom:2px solid ${COLORS.border};color:${COLORS.muted};font-size:12px;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;">Cible</th>
            ${colonnePoids}
          </tr>
        </thead>
        <tbody>
          ${lignesKpi}
        </tbody>
      </table>
      ${ctaButton(`${baseUrl}/employe/mes-kpi`, 'Valider mes KPI')}
    `,
  })
}

export function templateSaisieValidee(
  brand: EmailBrand,
  prenom: string,
  mois: string,
  score: number
) {
  return wrapEmailLayout(brand, {
    title: 'Saisie validée',
    preheader: `Score du mois : ${score.toFixed(1)}%`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${escapeHtml(prenom)}</strong>,</p>
      <p style="margin:0;">Votre saisie KPI du mois de <strong>${escapeHtml(mois)}</strong> a été validée par votre manager.</p>
      ${infoCard(`
        <p style="margin:0 0 4px;font-size:12px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.04em;">Score du mois</p>
        <p style="margin:0;font-size:28px;line-height:1.2;color:${COLORS.primary};font-weight:700;">${score.toFixed(1)}%</p>
      `)}
      ${ctaButton(`${baseUrl}/dashboard/employe`, 'Voir mon tableau de bord')}
    `,
  })
}

export function templateKpiReponseContestation(
  brand: EmailBrand,
  prenomEmploye: string,
  managerNom: string,
  nomKpi: string,
  decision: 'MAINTENU' | 'REVISE',
  reponse: string,
  cible?: number,
  poids?: number
) {
  const titreDecision =
    decision === 'MAINTENU' ? 'Votre contestation a été examinée' : 'Votre KPI a été révisé'
  const intro =
    decision === 'MAINTENU'
      ? `<strong>${escapeHtml(managerNom)}</strong> a maintenu le KPI tel quel après examen de votre contestation.`
      : `<strong>${escapeHtml(managerNom)}</strong> a révisé le KPI suite à votre contestation.`

  const revisionBlock =
    decision === 'REVISE' && cible != null
      ? infoCard(`
          <p style="margin:0 0 6px;font-size:12px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.04em;">Nouveaux objectifs</p>
          <p style="margin:0;font-size:16px;color:${COLORS.primary};font-weight:700;">
            Cible : ${Number(cible).toFixed(1)}${poids != null && poids > 0 ? ` · Poids : ${poids}%` : ''}
          </p>
        `)
      : ''

  return wrapEmailLayout(brand, {
    title: titreDecision,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${escapeHtml(prenomEmploye)}</strong>,</p>
      <p style="margin:0 0 12px;">${intro}</p>
      <p style="margin:0 0 8px;"><strong>KPI :</strong> ${escapeHtml(nomKpi)}</p>
      ${infoCard(`
        <p style="margin:0 0 8px;font-size:12px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.04em;">Réponse de votre manager</p>
        <p style="margin:0;font-style:italic;color:${COLORS.text};white-space:pre-wrap;">${escapeHtml(reponse)}</p>
      `)}
      ${revisionBlock}
      <p style="margin:0;">Vous pouvez dès maintenant saisir vos réalisations pour ce KPI.</p>
      ${ctaButton(`${baseUrl}/saisie`, 'Saisir mes réalisations')}
    `,
  })
}

export function templateKpiConteste(
  brand: EmailBrand,
  prenomManager: string,
  prenomEmploye: string,
  nomKpi: string,
  motif: string
) {
  return wrapEmailLayout(brand, {
    title: 'KPI contesté',
    preheader: `${prenomEmploye} a contesté un KPI`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${escapeHtml(prenomManager)}</strong>,</p>
      <p style="margin:0 0 12px;"><strong>${escapeHtml(prenomEmploye)}</strong> a contesté le KPI
         <strong>« ${escapeHtml(nomKpi)} »</strong>.</p>
      ${infoCard(
        `
        <p style="margin:0 0 6px;font-size:12px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:0.04em;">Motif</p>
        <p style="margin:0;font-style:italic;color:${COLORS.text};">« ${escapeHtml(motif)} »</p>
      `,
        COLORS.danger
      )}
      <p style="margin:0;">Vous avez 5 jours ouvrés pour répondre à cette contestation.</p>
      ${ctaButton(`${baseUrl}/manager/assignation/contestations`, 'Traiter la contestation', 'danger')}
    `,
  })
}

export function templateNouveauCompte(
  brand: EmailBrand,
  prenom: string,
  email: string,
  motDePasseTemporaire: string
) {
  const nom = typeof brand === 'string' ? brand : brand.nom
  return wrapEmailLayout(brand, {
    title: 'Votre compte a été créé',
    preheader: 'Vos identifiants de connexion',
    footerNote:
      'Cet e-mail est envoyé automatiquement par le Système KPI. Conservez ces identifiants en lieu sûr.',
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${escapeHtml(prenom || email)}</strong>,</p>
      <p style="margin:0 0 12px;">Un compte utilisateur a été créé pour vous dans le Système KPI de <strong>${escapeHtml(nom)}</strong>.</p>
      <p style="margin:0 0 8px;">Voici vos identifiants de connexion :</p>
      ${infoCard(`
        <p style="margin:0 0 10px;"><strong>Email :</strong> ${escapeHtml(email)}</p>
        <p style="margin:0;"><strong>Mot de passe temporaire :</strong>
          <code style="background:#ffffff;border:1px solid ${COLORS.border};padding:3px 8px;border-radius:4px;font-size:13px;display:inline-block;">${escapeHtml(motDePasseTemporaire)}</code>
        </p>
      `)}
      <p style="margin:0;"><strong>Important :</strong> Vous serez invité à modifier ce mot de passe lors de votre première connexion.</p>
      ${ctaButton(`${baseUrl}/login`, 'Se connecter')}
    `,
  })
}

export function templateRenvoiMotDePasse(
  brand: EmailBrand,
  prenom: string,
  email: string,
  motDePasseTemporaire: string
) {
  const nom = typeof brand === 'string' ? brand : brand.nom
  return wrapEmailLayout(brand, {
    title: 'Nouveau mot de passe',
    preheader: 'Mot de passe temporaire généré',
    footerNote:
      "Si vous n'êtes pas à l'origine de cette demande, contactez votre administrateur.",
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${escapeHtml(prenom || email)}</strong>,</p>
      <p style="margin:0 0 12px;">Un nouveau mot de passe temporaire a été généré pour votre compte du Système KPI de <strong>${escapeHtml(nom)}</strong>.</p>
      ${infoCard(`
        <p style="margin:0 0 10px;"><strong>Email :</strong> ${escapeHtml(email)}</p>
        <p style="margin:0;"><strong>Mot de passe temporaire :</strong>
          <code style="background:#ffffff;border:1px solid ${COLORS.border};padding:3px 8px;border-radius:4px;font-size:13px;display:inline-block;">${escapeHtml(motDePasseTemporaire)}</code>
        </p>
      `)}
      <p style="margin:0;"><strong>Important :</strong> Votre ancien mot de passe n&apos;est plus valide. Vous devrez le modifier lors de votre prochaine connexion.</p>
      ${ctaButton(`${baseUrl}/login`, 'Se connecter')}
    `,
  })
}

export function templateSaisieEnRetard(
  brand: EmailBrand,
  prenom: string,
  mois: string,
  managerNom: string
) {
  return wrapEmailLayout(brand, {
    title: 'Saisie en retard',
    preheader: `Date limite dépassée pour ${mois}`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Bonjour <strong>${escapeHtml(prenom)}</strong>,</p>
      <p style="margin:0 0 12px;">La date limite de saisie pour le mois de <strong>${escapeHtml(mois)}</strong>
         est dépassée. Votre manager <strong>${escapeHtml(managerNom)}</strong>
         a été informé.</p>
      <p style="margin:0;">Veuillez saisir vos réalisations dès que possible.
         Une saisie non effectuée sera comptabilisée comme 0%.</p>
      ${ctaButton(`${baseUrl}/saisie`, 'Saisir maintenant', 'danger')}
    `,
  })
}

export function templateTestEmail(brand: EmailBrand) {
  return wrapEmailLayout(brand, {
    title: "Test d'envoi",
    preheader: 'Configuration SMTP OK',
    bodyHtml: `
      <p style="margin:0 0 12px;">Ce message confirme que la configuration SMTP du Système KPI fonctionne correctement.</p>
      <p style="margin:0;color:${COLORS.muted};font-size:13px;">Envoyé le ${new Date().toLocaleString('fr-FR')}</p>
    `,
  })
}
