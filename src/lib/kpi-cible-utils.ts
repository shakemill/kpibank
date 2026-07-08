/**
 * Utilitaires de normalisation des cibles KPI (répertoire BGFI).
 */

export type SensCalculKpi = 'DIRECT' | 'PLAFOND' | 'ZERO_DEFAUT' | 'ABSOLU'

export type CategorieKpi = 'STRATEGIQUE' | 'OPERATIONNEL'

export type FrequenceKpi =
  | 'MENSUELLE'
  | 'TRIMESTRIELLE'
  | 'SEMESTRIELLE'
  | 'ANNUELLE'
  | 'EVENEMENTIELLE'

const PLAFOND_KEYWORDS =
  /concentration|attrition|anomalies|coefficient|taux de reprises|articles négatifs|NPS/i

const ZERO_DEFAUT_KEYWORDS = /aucune|zéro|zero|0 suspens/i

const QUALITATIF_KEYWORDS =
  /rapport de veille|NPS|satisfaction|enquête|enquete|participation/i

/**
 * Détecte le sens de calcul à partir de l'indicateur et de la cible Excel.
 */
export function detecterSensCalcul(
  indicateur: string,
  cibleBrute: unknown
): SensCalculKpi {
  const ind = indicateur.trim()

  if (typeof cibleBrute === 'string' && /million/i.test(cibleBrute)) {
    return 'ABSOLU'
  }

  if (cibleBrute === 0 || cibleBrute === '0') {
    if (ZERO_DEFAUT_KEYWORDS.test(ind)) return 'ZERO_DEFAUT'
  }

  if (typeof cibleBrute === 'number' && cibleBrute > 0 && cibleBrute <= 1) {
    if (PLAFOND_KEYWORDS.test(ind)) return 'PLAFOND'
  }

  if (typeof cibleBrute === 'number' && cibleBrute > 1 && cibleBrute <= 2) {
    return 'DIRECT'
  }

  return 'DIRECT'
}

/**
 * Normalise une cible Excel vers la valeur stockée en base.
 * - Décimal 0 < x ≤ 1 → x × 100 (sauf ZERO_DEFAUT où cible = 0)
 * - ABSOLU : parse texte ("120 Millions" → 120)
 * - DIRECT avec x > 1 → x × 100 (ex. 1.2 → 120)
 */
export function normaliserCibleExcel(
  valeur: unknown,
  sensCalcul: SensCalculKpi
): number {
  if (sensCalcul === 'ZERO_DEFAUT') return 0

  if (typeof valeur === 'string') {
    const match = valeur.match(/([\d.,]+)/)
    if (match) {
      const num = parseFloat(match[1].replace(',', '.'))
      return Number.isNaN(num) ? 0 : num
    }
    return 0
  }

  if (typeof valeur !== 'number' || Number.isNaN(valeur)) return 0

  if (sensCalcul === 'ABSOLU') return valeur

  if (valeur > 0 && valeur <= 1) {
    return Math.round(valeur * 10000) / 100
  }

  if (valeur > 1 && valeur <= 2) {
    return Math.round(valeur * 10000) / 100
  }

  return valeur
}

/**
 * Mappe la fréquence Excel vers l'enum FrequenceKpi.
 */
export function mapperFrequenceExcel(freq: string): FrequenceKpi {
  const f = freq.trim().toLowerCase()
  if (f.includes('mensuelle')) return 'MENSUELLE'
  if (f.includes('trimestrielle')) return 'TRIMESTRIELLE'
  if (f.includes('semestrielle')) return 'SEMESTRIELLE'
  if (f.includes('annuelle')) return 'ANNUELLE'
  if (f.includes('ca/ag') || f.includes('événement')) return 'EVENEMENTIELLE'
  return 'MENSUELLE'
}

/** Libellés français des fréquences KPI. */
export const FREQUENCE_KPI_LABELS: Record<FrequenceKpi, string> = {
  MENSUELLE: 'Mensuelle',
  TRIMESTRIELLE: 'Trimestrielle',
  SEMESTRIELLE: 'Semestrielle',
  ANNUELLE: 'Annuelle',
  EVENEMENTIELLE: 'Événementielle',
}

export function libellerFrequenceKpi(frequence: string | null | undefined): string {
  if (!frequence) return '—'
  return FREQUENCE_KPI_LABELS[frequence as FrequenceKpi] ?? frequence
}

/**
 * Détermine le mode d'agrégation selon la fréquence.
 */
export function modeAgregationDepuisFrequence(
  frequence: FrequenceKpi
): 'CUMUL' | 'MOYENNE' | 'DERNIER' {
  if (frequence === 'MENSUELLE') return 'MOYENNE'
  return 'DERNIER'
}

/**
 * Détermine le type KPI catalogue (QUANTITATIF vs QUALITATIF).
 */
export function typeKpiDepuisIndicateur(indicateur: string): 'QUANTITATIF' | 'QUALITATIF' {
  const ind = indicateur.trim()
  const hasRatio = /[\/÷×]/.test(ind) || /100/.test(ind) || /%/.test(ind)
  if (!hasRatio && QUALITATIF_KEYWORDS.test(ind)) return 'QUALITATIF'
  if (!hasRatio) return 'QUALITATIF'
  return 'QUANTITATIF'
}

/**
 * Unité par défaut selon le sens et le type.
 */
export function uniteDepuisSens(
  sensCalcul: SensCalculKpi,
  type: 'QUANTITATIF' | 'QUALITATIF',
  cibleBrute: unknown
): string | null {
  if (sensCalcul === 'ABSOLU') {
    if (typeof cibleBrute === 'string' && /million/i.test(cibleBrute)) {
      return 'M XAF'
    }
    return null
  }
  if (type === 'QUALITATIF') return '%'
  return '%'
}

/**
 * Nettoie le nom KPI pour l'affichage : retire le préfixe [CODE] et les parenthèses englobantes.
 */
export function formaterNomKpiAffichage(nom: string): string {
  if (!nom) return ''
  let s = nom.trim().replace(/^\[[^\]]+\]\s*/, '')
  const ratioFois100 = s.match(/^\(([\s\S]+)\)\s*(×\s*100)\s*$/)
  if (ratioFois100) {
    return `${ratioFois100[1].trim()} ${ratioFois100[2].trim()}`
  }
  if (s.startsWith('(') && s.endsWith(')')) {
    return s.slice(1, -1).trim()
  }
  return s
}

/** Normalise une chaîne pour la recherche (accents, casse, apostrophes). */
export function normaliserTexteRecherche(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[''""`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/** Vérifie si un KPI catalogue correspond à une requête de recherche. */
export function kpiCorrespondRecherche(
  row: {
    nom: string
    code?: string | null
    description?: string | null
    objectif_qualite?: string | null
  },
  query: string
): boolean {
  const q = normaliserTexteRecherche(query)
  if (!q) return true
  const champs = [
    row.nom,
    formaterNomKpiAffichage(row.nom),
    row.code ?? '',
    row.description ?? '',
    row.objectif_qualite ?? '',
  ].map(normaliserTexteRecherche)
  return champs.some((h) => h.includes(q))
}

/**
 * Répartit 100 % en poids égaux (dernier KPI absorbe le reste).
 */
export function repartirPoidsEgaux(nbKpis: number): number[] {
  if (nbKpis <= 0) return []
  const base = Math.floor((100 / nbKpis) * 100) / 100
  const poids: number[] = Array(nbKpis).fill(base)
  const sum = Math.round(base * (nbKpis - 1) * 100) / 100
  poids[nbKpis - 1] = Math.round((100 - sum) * 100) / 100
  return poids
}

/**
 * Indique si un mois donné est saisissable selon la fréquence du KPI.
 */
export function moisSaisissablePourFrequence(
  frequence: FrequenceKpi,
  mois: number,
  moisDebut: number,
  moisFin: number
): boolean {
  if (mois < moisDebut || mois > moisFin) return false

  switch (frequence) {
    case 'MENSUELLE':
      return true
    case 'TRIMESTRIELLE':
      return [3, 6, 9, 12].includes(mois)
    case 'SEMESTRIELLE':
      return mois === moisFin || mois === Math.min(moisFin, moisDebut + 5)
    case 'ANNUELLE':
      return mois === moisFin
    case 'EVENEMENTIELLE':
      return true
    default:
      return true
  }
}

/**
 * Liste les mois saisissables dans une période selon la fréquence.
 */
export function moisSaisissablesPourFrequence(
  frequence: FrequenceKpi,
  moisDebut: number,
  moisFin: number
): number[] {
  const mois: number[] = []
  for (let m = moisDebut; m <= moisFin; m++) {
    if (moisSaisissablePourFrequence(frequence, m, moisDebut, moisFin)) {
      mois.push(m)
    }
  }
  return mois
}
