import {
  DEFAULT_GRILLE_CONFIG,
  getSeuilObjectifAtteint,
  resolveNiveauFromConfig,
  toGrilleReferenceRows,
  type GrilleNiveauConfig,
} from '@/lib/notation-grille-config'

export type NiveauNotation =
  | 'EXCELLENT'
  | 'TRES_BIEN'
  | 'SATISFAISANT'
  | 'MOYEN'
  | 'INSUFFISANT'

export type NotationGrilleResult = {
  niveau: NiveauNotation
  appreciation: string
  commentaire: string
  chartColor: string
  textClassName: string
  progressClassName: string
  badgeClassName: string
  heatmapClassName: string
}

const NIVEAU_CONFIG: Record<
  NiveauNotation,
  Omit<NotationGrilleResult, 'niveau' | 'appreciation' | 'commentaire'>
> = {
  EXCELLENT: {
    chartColor: '#3b82f6',
    textClassName: 'text-blue-600 dark:text-blue-400 font-medium',
    progressClassName: '[&_[data-slot=progress-indicator]]:!bg-blue-500',
    badgeClassName:
      'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200',
    heatmapClassName: 'bg-blue-500/20 text-blue-900 dark:text-blue-100',
  },
  TRES_BIEN: {
    chartColor: '#22c55e',
    textClassName: 'text-green-600 dark:text-green-400 font-medium',
    progressClassName: '[&_[data-slot=progress-indicator]]:!bg-green-500',
    badgeClassName:
      'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200',
    heatmapClassName: 'bg-green-500/20 text-green-900 dark:text-green-100',
  },
  SATISFAISANT: {
    chartColor: '#f59e0b',
    textClassName: 'text-amber-600 dark:text-amber-400 font-medium',
    progressClassName: '[&_[data-slot=progress-indicator]]:!bg-amber-500',
    badgeClassName:
      'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200',
    heatmapClassName: 'bg-amber-500/30 text-amber-900 dark:text-amber-100',
  },
  MOYEN: {
    chartColor: '#f97316',
    textClassName: 'text-orange-600 dark:text-orange-400 font-medium',
    progressClassName: '[&_[data-slot=progress-indicator]]:!bg-orange-500',
    badgeClassName:
      'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200',
    heatmapClassName: 'bg-orange-500/30 text-orange-900 dark:text-orange-100',
  },
  INSUFFISANT: {
    chartColor: '#ef4444',
    textClassName: 'text-red-600 dark:text-red-400 font-medium',
    progressClassName: '[&_[data-slot=progress-indicator]]:!bg-red-500',
    badgeClassName:
      'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200',
    heatmapClassName: 'bg-red-500/30 text-red-900 dark:text-red-100',
  },
}

let activeGrilleConfig: GrilleNiveauConfig[] | null = null

export function setActiveNotationGrille(config: GrilleNiveauConfig[]): void {
  activeGrilleConfig = config
}

export function getActiveNotationGrille(): GrilleNiveauConfig[] {
  return activeGrilleConfig ?? DEFAULT_GRILLE_CONFIG
}

export const GRILLE_REFERENCE = toGrilleReferenceRows(DEFAULT_GRILLE_CONFIG)

export function getGrilleReference(config?: GrilleNiveauConfig[]) {
  return toGrilleReferenceRows(config ?? getActiveNotationGrille())
}

export function getNiveauNotation(taux: number, config?: GrilleNiveauConfig[]): NiveauNotation {
  return resolveNiveauFromConfig(taux, config ?? getActiveNotationGrille())
}

export function getNotationGrille(
  taux: number,
  config?: GrilleNiveauConfig[]
): NotationGrilleResult {
  const grille = config ?? getActiveNotationGrille()
  const niveau = resolveNiveauFromConfig(taux, grille)
  const row = grille.find((r) => r.niveau === niveau)
  return {
    niveau,
    appreciation: row?.appreciation ?? niveau,
    commentaire: row?.commentaire ?? '',
    ...NIVEAU_CONFIG[niveau],
  }
}

export function isObjectifAtteint(taux: number, config?: GrilleNiveauConfig[]): boolean {
  return taux >= getSeuilObjectifAtteint(config ?? getActiveNotationGrille())
}

export const SEUIL_OBJECTIF_ATTEINT = getSeuilObjectifAtteint(DEFAULT_GRILLE_CONFIG)
