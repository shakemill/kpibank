import type { NiveauNotation } from '@/lib/notation-grille'

export type GrilleNiveauConfig = {
  niveau: NiveauNotation
  ordre: number
  seuilMin: number
  seuilMax: number | null
  notationLibelle: string | null
  appreciation: string
  commentaire: string
}

export const NIVEAUX_NOTATION: NiveauNotation[] = [
  'EXCELLENT',
  'TRES_BIEN',
  'SATISFAISANT',
  'MOYEN',
  'INSUFFISANT',
]

export const DEFAULT_GRILLE_CONFIG: GrilleNiveauConfig[] = [
  {
    niveau: 'EXCELLENT',
    ordre: 1,
    seuilMin: 101,
    seuilMax: null,
    notationLibelle: '101% et +',
    appreciation: 'Excellent',
    commentaire: 'Dépasse largement les attentes',
  },
  {
    niveau: 'TRES_BIEN',
    ordre: 2,
    seuilMin: 96,
    seuilMax: 100,
    notationLibelle: '96% et 100%',
    appreciation: 'Très Bien',
    commentaire: 'Correspond aux attentes',
  },
  {
    niveau: 'SATISFAISANT',
    ordre: 3,
    seuilMin: 86,
    seuilMax: 95.99,
    notationLibelle: '86% à 95,99%',
    appreciation: 'Satisfaisant',
    commentaire: "Sur certains aspects de son poste a besoin d'amélioration",
  },
  {
    niveau: 'MOYEN',
    ordre: 4,
    seuilMin: 50,
    seuilMax: 85.99,
    notationLibelle: '50% à 85,99%',
    appreciation: 'Moyen',
    commentaire: 'En dessous des attentes',
  },
  {
    niveau: 'INSUFFISANT',
    ordre: 5,
    seuilMin: 0,
    seuilMax: 49.99,
    notationLibelle: '<50%',
    appreciation: 'Insuffisant',
    commentaire: 'Ne répond pas aux attentes',
  },
]

export function formatNotationLabel(seuilMin: number, seuilMax: number | null): string {
  if (seuilMax == null && seuilMin > 100) {
    return `${Math.round(seuilMin)}% et +`
  }
  if (seuilMax != null && seuilMin <= 0 && seuilMax < 50) {
    return `<${Math.round(seuilMax + 0.01)}%`
  }
  if (seuilMax == null) {
    return `≥${Math.round(seuilMin)}%`
  }
  return `${Math.round(seuilMin)}% et ${Math.round(seuilMax)}%`
}

export function getNotationDisplay(row: Pick<GrilleNiveauConfig, 'notationLibelle' | 'seuilMin' | 'seuilMax'>): string {
  return row.notationLibelle?.trim() || formatNotationLabel(row.seuilMin, row.seuilMax)
}

export function resolveNiveauFromConfig(
  taux: number,
  config: GrilleNiveauConfig[]
): NiveauNotation {
  const sorted = [...config].sort((a, b) => a.seuilMin - b.seuilMin)

  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i]
    const next = sorted[i + 1]
    let effectiveMax = row.seuilMax

    // Comble les trous entre seuilMax et le seuilMin du niveau supérieur (ex. 95,1% entre 95 et 96).
    if (next && effectiveMax != null && effectiveMax < next.seuilMin - 1e-9) {
      effectiveMax = next.seuilMin - 1e-9
    } else if (next && effectiveMax == null && row.niveau !== 'EXCELLENT') {
      effectiveMax = next.seuilMin - 1e-9
    }

    if (taux >= row.seuilMin && (effectiveMax == null || taux <= effectiveMax)) {
      return row.niveau
    }
  }

  const top = [...config].sort((a, b) => b.seuilMin - a.seuilMin)[0]
  if (top && taux >= top.seuilMin) return top.niveau

  return sorted[0]?.niveau ?? 'INSUFFISANT'
}

export function getSeuilObjectifAtteint(config: GrilleNiveauConfig[]): number {
  const tresBien = config.find((n) => n.niveau === 'TRES_BIEN')
  return tresBien?.seuilMin ?? 96
}

export function toGrilleReferenceRows(config: GrilleNiveauConfig[]) {
  return [...config]
    .sort((a, b) => a.ordre - b.ordre)
    .map((row) => ({
      niveau: row.niveau,
      notation: getNotationDisplay(row),
      appreciation: row.appreciation,
      commentaire: row.commentaire,
    }))
}
