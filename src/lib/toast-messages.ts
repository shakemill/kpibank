export const TOAST = {
  // ── Authentification
  LOGIN_SUCCESS: 'Connexion réussie',
  LOGIN_ERROR: 'Email ou mot de passe incorrect',
  LOGOUT_SUCCESS: 'Déconnexion réussie',
  PASSWORD_CHANGED: 'Mot de passe modifié avec succès',
  PASSWORD_ERROR: 'Erreur lors du changement de mot de passe',

  // ── Organisation
  DIRECTION_CREATED: 'Direction ajoutée avec succès',
  DIRECTION_UPDATED: 'Direction modifiée avec succès',
  DIRECTION_DELETED: 'Direction supprimée',
  DIRECTION_ACTIVATED: 'Direction activée',
  DIRECTION_DEACTIVATED: 'Direction désactivée',

  SERVICE_CREATED: 'Service ajouté avec succès',
  SERVICE_UPDATED: 'Service modifié avec succès',
  SERVICE_DELETED: 'Service supprimé',

  USER_CREATED: 'Utilisateur créé avec succès',
  USER_UPDATED: 'Utilisateur modifié avec succès',
  USER_ACTIVATED: 'Compte utilisateur activé',
  USER_DEACTIVATED: 'Compte utilisateur désactivé',
  USER_PASSWORD_RESET: 'Mot de passe réinitialisé — email envoyé',

  // ── Paramètres
  PARAMS_SAVED: 'Paramètres sauvegardés avec succès',
  EMAIL_TEST_SUCCESS: 'Email de test envoyé avec succès',
  EMAIL_TEST_ERROR: "Échec de l'envoi — vérifiez la configuration SMTP",

  // ── Périodes
  PERIODE_CREATED: 'Période créée avec succès',
  PERIODE_ACTIVATED: 'Période passée en statut EN COURS',
  PERIODE_CLOSED: 'Période clôturée définitivement',
  PERIODE_ERROR_ALREADY_ACTIVE: 'Une période de ce type est déjà EN COURS',

  // ── Catalogue KPI
  CATALOGUE_CREATED: 'KPI ajouté au catalogue',
  CATALOGUE_UPDATED: 'KPI catalogue modifié',
  CATALOGUE_DEACTIVATED: 'KPI désactivé du catalogue',

  // ── KPI Direction
  KPI_DIR_CREATED: 'KPI direction ajouté avec succès',
  KPI_DIR_UPDATED: 'KPI direction modifié avec succès',
  KPI_DIR_DELETED: 'KPI direction supprimé',
  KPI_DIR_ACTIVATED: 'KPI direction activé',
  KPI_DIR_POIDS_ERROR: (restant: number) =>
    `Poids insuffisant — poids restant disponible : ${restant}%`,
  KPI_DIR_POIDS_INCOMPLET: (actuel: number) =>
    `Attention : poids total = ${actuel}% (doit être 100% pour activer)`,

  // ── KPI Service
  KPI_SRV_CREATED: 'KPI service ajouté avec succès',
  KPI_SRV_UPDATED: 'KPI service modifié avec succès',
  KPI_SRV_DELETED: 'KPI service supprimé',
  KPI_SRV_POIDS_ERROR: (restant: number) =>
    `Poids insuffisant — poids restant disponible : ${restant}%`,

  // ── KPI Employé / Assignation
  KPI_EMP_ASSIGNED: 'KPI assigné avec succès',
  KPI_EMP_UPDATED: 'KPI employé modifié',
  KPI_EMP_DELETED: 'KPI employé supprimé',
  KPI_EMP_NOTIFIED: (prenom: string) => `KPI envoyés à ${prenom} avec succès`,
  KPI_EMP_POIDS_ERROR: (restant: number) =>
    `Poids insuffisant — poids restant disponible : ${restant}%`,
  KPI_EMP_POIDS_INCOMPLET: 'La somme des poids doit être 100% avant de notifier',

  // ── Acceptation / Contestation
  KPI_ACCEPTED: 'KPI accepté',
  KPI_CONTESTED: 'Contestation envoyée à votre manager',
  KPI_MAINTAINED: "KPI maintenu — réponse envoyée à l'employé",
  KPI_REVISED: "KPI révisé — employé notifié",
  CONTESTATION_MOTIF_ERROR: 'Le motif est obligatoire (minimum 50 caractères)',

  // ── Saisie mensuelle
  SAISIE_SAVED: 'Saisie enregistrée en brouillon',
  SAISIE_SUBMITTED: 'Saisie soumise pour validation',
  SAISIE_INCOMPLETE: 'Veuillez renseigner tous les KPI avant de soumettre',
  SAISIE_VALIDATED: (prenom: string) => `Saisie de ${prenom} validée`,
  SAISIE_ADJUSTED: (prenom: string) => `Saisie de ${prenom} ajustée`,
  SAISIE_REJECTED: (prenom: string) => `Saisie de ${prenom} rejetée — employé notifié`,
  SAISIE_BULK_VALIDATED: (n: number) => `${n} saisie(s) validée(s) avec succès`,
  SAISIE_MOTIF_REQUIRED: 'Le motif est obligatoire',
  SAISIE_VALEUR_REQUIRED: 'La nouvelle valeur est obligatoire',

  // ── Erreurs génériques
  ERROR_UNAUTHORIZED: 'Accès non autorisé',
  ERROR_NOT_FOUND: 'Ressource introuvable',
  ERROR_SERVER: 'Erreur serveur — réessayez dans quelques instants',
  ERROR_NETWORK: 'Erreur de connexion au serveur',
  ERROR_VALIDATION: 'Veuillez corriger les erreurs dans le formulaire',
} as const
