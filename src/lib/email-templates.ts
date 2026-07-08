const baseUrl = process.env.NEXTAUTH_URL ?? ''

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type KpiRecapEmailRow = {
  nom: string
  cible: number
  unite: string | null
  poids: number
}

export function templateRappelSaisie(nomEtablissement: string, prenom: string, mois: string, dateLimite: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1F4E79; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 18px;">
          Système KPI — ${nomEtablissement}
        </h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #1F4E79;">Rappel : Saisie KPI de ${mois}</h2>
        <p>Bonjour <strong>${prenom}</strong>,</p>
        <p>Vous avez jusqu'au <strong>${dateLimite}</strong> pour saisir 
           vos réalisations KPI du mois de <strong>${mois}</strong>.</p>
        <p>Merci de vous connecter dès que possible pour éviter 
           que vos saisies soient marquées comme manquantes.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/saisie"
             style="background: #2E75B6; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Accéder à ma saisie
          </a>
        </div>
        <p style="color: #888; font-size: 12px;">
          Cet email est envoyé automatiquement par le Système KPI.
        </p>
      </div>
    </div>
  `
}

export function templateKpiNotifie(
  nomEtablissement: string,
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
        ? `<td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${k.poids > 0 ? `${k.poids}%` : '—'}</td>`
        : ''
      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(k.nom)}</td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${cibleLabel}</td>
          ${poidsCell}
        </tr>
      `
    })
    .join('')

  const colonnePoids = afficherPoids
    ? '<th style="padding: 10px 12px; text-align: right; border-bottom: 2px solid #1F4E79;">Poids</th>'
    : ''

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1F4E79; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 18px;">
          Système KPI — ${escapeHtml(nomEtablissement)}
        </h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #1F4E79;">Vos KPI ont été assignés</h2>
        <p>Bonjour <strong>${escapeHtml(prenom)}</strong>,</p>
        <p><strong>${escapeHtml(managerNom)}</strong> vous a assigné
           <strong>${nombreKpi} KPI</strong> pour la période
           <strong>${escapeHtml(periodeCode)}</strong>.</p>
        <p>Voici le récapitulatif de vos objectifs. Veuillez les accepter ou les contester dans les 3 jours.</p>
        <table style="width: 100%; border-collapse: collapse; background: white; margin: 20px 0; font-size: 14px;">
          <thead>
            <tr style="background: #eef4fa;">
              <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #1F4E79;">Indicateur</th>
              <th style="padding: 10px 12px; text-align: right; border-bottom: 2px solid #1F4E79;">Cible</th>
              ${colonnePoids}
            </tr>
          </thead>
          <tbody>
            ${lignesKpi}
          </tbody>
        </table>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/employe/mes-kpi"
             style="background: #2E75B6; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Valider mes KPI
          </a>
        </div>
        <p style="color: #888; font-size: 12px;">
          Cet email est envoyé automatiquement par le Système KPI.
        </p>
      </div>
    </div>
  `
}

export function templateSaisieValidee(nomEtablissement: string, prenom: string, mois: string, score: number) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1F4E79; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 18px;">
          Système KPI — ${nomEtablissement}
        </h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #1F4E79;">Saisie validée ✅</h2>
        <p>Bonjour <strong>${prenom}</strong>,</p>
        <p>Votre saisie KPI du mois de <strong>${mois}</strong> 
           a été validée par votre manager.</p>
        <div style="background: white; border-left: 4px solid #2E75B6; 
                    padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 24px; color: #1F4E79; font-weight: bold;">
            Score du mois : ${score.toFixed(1)}%
          </p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/dashboard/employe"
             style="background: #2E75B6; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Voir mon tableau de bord
          </a>
        </div>
      </div>
    </div>
  `
}

export function templateKpiReponseContestation(
  nomEtablissement: string,
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
      ? `
        <div style="background: white; border-left: 4px solid #2E75B6; padding: 15px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #555;">Nouveaux objectifs :</p>
          <p style="margin: 0; font-size: 16px; color: #1F4E79; font-weight: bold;">
            Cible : ${Number(cible).toFixed(1)}${poids != null && poids > 0 ? ` · Poids : ${poids}%` : ''}
          </p>
        </div>
      `
      : ''

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1F4E79; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 18px;">
          Système KPI — ${escapeHtml(nomEtablissement)}
        </h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #1F4E79;">${titreDecision}</h2>
        <p>Bonjour <strong>${escapeHtml(prenomEmploye)}</strong>,</p>
        <p>${intro}</p>
        <p style="margin: 16px 0 8px 0;"><strong>KPI :</strong> ${escapeHtml(nomKpi)}</p>
        <div style="background: white; border-left: 4px solid #1F4E79; padding: 15px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #555;">Réponse de votre manager :</p>
          <p style="margin: 0; font-style: italic; color: #333; white-space: pre-wrap;">${escapeHtml(reponse)}</p>
        </div>
        ${revisionBlock}
        <p>Vous pouvez dès maintenant saisir vos réalisations pour ce KPI.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/saisie"
             style="background: #2E75B6; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Saisir mes réalisations
          </a>
        </div>
        <p style="color: #888; font-size: 12px;">
          Cet email est envoyé automatiquement par le Système KPI.
        </p>
      </div>
    </div>
  `
}

export function templateKpiConteste(
  nomEtablissement: string,
  prenomManager: string,
  prenomEmploye: string,
  nomKpi: string,
  motif: string
) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1F4E79; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 18px;">
          Système KPI — ${nomEtablissement}
        </h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #C00000;">KPI contesté ⚠️</h2>
        <p>Bonjour <strong>${prenomManager}</strong>,</p>
        <p><strong>${prenomEmploye}</strong> a contesté le KPI 
           <strong>"${nomKpi}"</strong>.</p>
        <div style="background: #fff3f3; border-left: 4px solid #C00000; 
                    padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-style: italic; color: #333;">
            "${motif}"
          </p>
        </div>
        <p>Vous avez 5 jours ouvrés pour répondre à cette contestation.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/manager/assignation/contestations"
             style="background: #C00000; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Traiter la contestation
          </a>
        </div>
      </div>
    </div>
  `
}

export function templateNouveauCompte(
  nomEtablissement: string,
  prenom: string,
  email: string,
  motDePasseTemporaire: string
) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1F4E79; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 18px;">
          Système KPI — ${nomEtablissement}
        </h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #1F4E79;">Votre compte a été créé</h2>
        <p>Bonjour <strong>${prenom || email}</strong>,</p>
        <p>Un compte utilisateur a été créé pour vous dans le Système KPI de <strong>${nomEtablissement}</strong>.</p>
        <p>Voici vos identifiants de connexion :</p>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Email :</strong> ${email}</p>
          <p style="margin: 0;"><strong>Mot de passe temporaire :</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${motDePasseTemporaire}</code></p>
        </div>
        <p><strong>Important :</strong> Vous serez invité à modifier ce mot de passe lors de votre première connexion.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/login"
             style="background: #2E75B6; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Se connecter
          </a>
        </div>
        <p style="color: #888; font-size: 12px;">
          Cet email est envoyé automatiquement par le Système KPI. Conservez ces identifiants en lieu sûr.
        </p>
      </div>
    </div>
  `
}

export function templateRenvoiMotDePasse(
  nomEtablissement: string,
  prenom: string,
  email: string,
  motDePasseTemporaire: string,
) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1F4E79; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 18px;">
          Système KPI — ${nomEtablissement}
        </h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #1F4E79;">Nouveau mot de passe</h2>
        <p>Bonjour <strong>${prenom || email}</strong>,</p>
        <p>Un nouveau mot de passe temporaire a été généré pour votre compte du Système KPI de <strong>${nomEtablissement}</strong>.</p>
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Email :</strong> ${email}</p>
          <p style="margin: 0;"><strong>Mot de passe temporaire :</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${motDePasseTemporaire}</code></p>
        </div>
        <p><strong>Important :</strong> Votre ancien mot de passe n&apos;est plus valide. Vous devrez le modifier lors de votre prochaine connexion.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/login"
             style="background: #2E75B6; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Se connecter
          </a>
        </div>
        <p style="color: #888; font-size: 12px;">
          Si vous n&apos;êtes pas à l&apos;origine de cette demande, contactez votre administrateur.
        </p>
      </div>
    </div>
  `
}

export function templateSaisieEnRetard(nomEtablissement: string, prenom: string, mois: string, managerNom: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1F4E79; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 18px;">
          Système KPI — ${nomEtablissement}
        </h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #C00000;">Saisie en retard ⚠️</h2>
        <p>Bonjour <strong>${prenom}</strong>,</p>
        <p>La date limite de saisie pour le mois de <strong>${mois}</strong> 
           est dépassée. Votre manager <strong>${managerNom}</strong> 
           a été informé.</p>
        <p>Veuillez saisir vos réalisations dès que possible. 
           Une saisie non effectuée sera comptabilisée comme 0%.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/saisie"
             style="background: #C00000; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Saisir maintenant
          </a>
        </div>
      </div>
    </div>
  `
}
