/** Libellés affichés des rôles utilisateur (enum Prisma inchangé). */
export const ROLE_LABELS: Record<string, string> = {
  DG: 'DG',
  DIRECTEUR: 'Directeur',
  CHEF_SERVICE: "Chef département / Chef d'agence",
  MANAGER: 'Manager',
  EMPLOYE: 'Employé',
}

export const ROLE_OPTIONS = (
  Object.entries(ROLE_LABELS) as [keyof typeof ROLE_LABELS, string][]
).map(([value, label]) => ({ value, label }))

export function libellerRole(role: string | null | undefined): string {
  if (!role) return '—'
  return ROLE_LABELS[role] ?? role
}

/** Couleurs de fond des cartes utilisateur (onglet Organisation). */
export const ROLE_CARD_CLASS: Record<string, string> = {
  DG: 'bg-red-50/90 dark:bg-red-950/25 border-red-200/70 dark:border-red-800/50 hover:border-red-300/80 dark:hover:border-red-700/60',
  DIRECTEUR: 'bg-orange-50/90 dark:bg-orange-950/25 border-orange-200/70 dark:border-orange-800/50 hover:border-orange-300/80 dark:hover:border-orange-700/60',
  CHEF_SERVICE: 'bg-violet-50/90 dark:bg-violet-950/25 border-violet-200/70 dark:border-violet-800/50 hover:border-violet-300/80 dark:hover:border-violet-700/60',
  MANAGER: 'bg-blue-50/90 dark:bg-blue-950/25 border-blue-200/70 dark:border-blue-800/50 hover:border-blue-300/80 dark:hover:border-blue-700/60',
}

const CARTE_EMPLOYE_CLASS = 'bg-card border-border/50 hover:border-primary/20'

export function classerCarteUtilisateur(role: string | null | undefined): string {
  if (role === 'EMPLOYE' || !role) return CARTE_EMPLOYE_CLASS
  return ROLE_CARD_CLASS[role] ?? CARTE_EMPLOYE_CLASS
}

/** Couleur du libellé de rôle sur les cartes utilisateur. */
export const ROLE_VALUE_CLASS: Record<string, string> = {
  DG: 'text-red-700 dark:text-red-400 font-medium',
  DIRECTEUR: 'text-orange-700 dark:text-orange-400 font-medium',
  CHEF_SERVICE: 'text-violet-700 dark:text-violet-400 font-medium',
  MANAGER: 'text-blue-700 dark:text-blue-400 font-medium',
  EMPLOYE: 'text-foreground/85 font-medium',
}

export function colorerValeurRole(role: string | null | undefined): string {
  if (!role) return ROLE_VALUE_CLASS.EMPLOYE
  return ROLE_VALUE_CLASS[role] ?? ROLE_VALUE_CLASS.EMPLOYE
}
