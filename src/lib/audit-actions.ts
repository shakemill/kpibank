/** Actions d'audit (codes + libellés FR) — module sûr côté client. */

export const AuditAction = {
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DEACTIVATE: 'USER_DEACTIVATE',
  USER_ACTIVATE: 'USER_ACTIVATE',
  USER_DELETE: 'USER_DELETE',
  USER_PASSWORD_RESEND: 'USER_PASSWORD_RESEND',

  DIRECTION_CREATE: 'DIRECTION_CREATE',
  DIRECTION_UPDATE: 'DIRECTION_UPDATE',
  DIRECTION_DEACTIVATE: 'DIRECTION_DEACTIVATE',
  DIRECTION_DELETE: 'DIRECTION_DELETE',

  SERVICE_CREATE: 'SERVICE_CREATE',
  SERVICE_UPDATE: 'SERVICE_UPDATE',
  SERVICE_DEACTIVATE: 'SERVICE_DEACTIVATE',
  SERVICE_DELETE: 'SERVICE_DELETE',

  KPI_ASSIGN: 'KPI_ASSIGN',
  KPI_NOTIFY: 'KPI_NOTIFY',
  KPI_ACCEPT: 'KPI_ACCEPT',
  KPI_CONTEST: 'KPI_CONTEST',
  KPI_CONTEST_REPLY: 'KPI_CONTEST_REPLY',

  SAISIE_SAVE: 'SAISIE_SAVE',
  SAISIE_SUBMIT: 'SAISIE_SUBMIT',
  SAISIE_VALIDATE: 'SAISIE_VALIDATE',
  SAISIE_REJECT: 'SAISIE_REJECT',
  SAISIE_ADJUST: 'SAISIE_ADJUST',
  SAISIE_VALIDATE_BATCH: 'SAISIE_VALIDATE_BATCH',

  SAISIE_DIR_SAVE: 'SAISIE_DIR_SAVE',
  SAISIE_DIR_SUBMIT: 'SAISIE_DIR_SUBMIT',
  SAISIE_DIR_VALIDATE: 'SAISIE_DIR_VALIDATE',
  SAISIE_DIR_REJECT: 'SAISIE_DIR_REJECT',

  AUTH_LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
  AUTH_LOGIN_FAIL: 'AUTH_LOGIN_FAIL',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
} as const

export type AuditActionCode = (typeof AuditAction)[keyof typeof AuditAction]

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  USER_CREATE: 'Création utilisateur',
  USER_UPDATE: 'Modification utilisateur',
  USER_DEACTIVATE: 'Désactivation utilisateur',
  USER_ACTIVATE: 'Activation utilisateur',
  USER_DELETE: 'Suppression utilisateur',
  USER_PASSWORD_RESEND: 'Renvoi mot de passe',

  DIRECTION_CREATE: 'Création direction',
  DIRECTION_UPDATE: 'Modification direction',
  DIRECTION_DEACTIVATE: 'Désactivation direction',
  DIRECTION_DELETE: 'Suppression direction',

  SERVICE_CREATE: 'Création département / agence',
  SERVICE_UPDATE: 'Modification département / agence',
  SERVICE_DEACTIVATE: 'Désactivation département / agence',
  SERVICE_DELETE: 'Suppression département / agence',

  KPI_ASSIGN: 'Assignation KPI',
  KPI_NOTIFY: 'Notification KPI',
  KPI_ACCEPT: 'Acceptation KPI',
  KPI_CONTEST: 'Contestation KPI',
  KPI_CONTEST_REPLY: 'Réponse à contestation',

  SAISIE_SAVE: 'Enregistrement saisie',
  SAISIE_SUBMIT: 'Soumission saisie',
  SAISIE_VALIDATE: 'Validation saisie',
  SAISIE_REJECT: 'Rejet saisie',
  SAISIE_ADJUST: 'Ajustement saisie',
  SAISIE_VALIDATE_BATCH: 'Validation saisie (lot)',

  SAISIE_DIR_SAVE: 'Enregistrement saisie direction',
  SAISIE_DIR_SUBMIT: 'Soumission saisie direction',
  SAISIE_DIR_VALIDATE: 'Validation saisie direction',
  SAISIE_DIR_REJECT: 'Rejet saisie direction',

  AUTH_LOGIN_SUCCESS: 'Connexion réussie',
  AUTH_LOGIN_FAIL: 'Échec de connexion',
  PASSWORD_CHANGE: 'Changement de mot de passe',
}

export function libellerActionAudit(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action
}
