const baseUrl = process.env.NEXTAUTH_URL ?? ''

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

export function templateKpiNotifie(nomEtablissement: string, prenom: string, managerNom: string, periodeCode: string, nombreKpi: number) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1F4E79; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 18px;">
          Système KPI — ${nomEtablissement}
        </h1>
      </div>
      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #1F4E79;">Vos KPI ont été assignés</h2>
        <p>Bonjour <strong>${prenom}</strong>,</p>
        <p><strong>${managerNom}</strong> vous a assigné 
           <strong>${nombreKpi} KPI</strong> pour la période 
           <strong>${periodeCode}</strong>.</p>
        <p>Veuillez vous connecter pour consulter vos objectifs 
           et les accepter ou les contester dans les 3 jours.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}/employe/mes-kpi"
             style="background: #2E75B6; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Consulter mes KPI
          </a>
        </div>
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
        <p>Bonjour <strong>${prenom}</strong>,</p>
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
