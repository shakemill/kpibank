/**
 * Utilitaires pour la saisie mensuelle des réalisations.
 */

export type StatutPeriodeSaisie = 'OUVERTE' | 'EN_RETARD' | 'VERROUILLEE'

export type ModeAgregation = 'CUMUL' | 'MOYENNE' | 'DERNIER'

export type TypeKpi = 'QUANTITATIF' | 'QUALITATIF' | 'COMPORTEMENTAL'

export interface SaisieMensuelleForAgregation {
  mois: number
  annee: number
  valeur_realisee: number | null
}

/** Saisie avec statut pour calcul du réalisé cumulé */
export interface SaisieMensuelleForCumul {
  mois: number
  annee: number
  valeur_realisee: number | null
  statut: string
}

const JOURS_RETARD_AVANT_VERROUILLE = 7

/**
 * Retourne true si la saisie est ouverte pour le mois M :
 * on est entre le 1er du mois M et le delaiJour du mois M+1 (inclus).
 */
export function isSaisieOuverte(
  mois: number,
  annee: number,
  delaiJour: number
): boolean {
  const start = new Date(annee, mois - 1, 1)
  const endMois = mois === 12 ? 1 : mois + 1
  const endAnnee = mois === 12 ? annee + 1 : annee
  const end = new Date(endAnnee, endMois - 1, delaiJour)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return now >= start && now <= end
}

/**
 * Statut de la période de saisie pour un mois donné.
 * - OUVERTE : dans les délais (du 1er du mois M au delaiJour du mois M+1)
 * - EN_RETARD : délai dépassé, encore modifiable (J+1 à J+7 après la date limite)
 * - VERROUILLEE : plus de saisie possible (après J+7)
 */
export function getStatutSaisie(
  mois: number,
  annee: number,
  delaiJour: number
): StatutPeriodeSaisie {
  const endMois = mois === 12 ? 1 : mois + 1
  const endAnnee = mois === 12 ? annee + 1 : annee
  const dateLimite = new Date(endAnnee, endMois - 1, delaiJour)
  dateLimite.setHours(23, 59, 59, 999)
  const aujourdhui = new Date()
  aujourdhui.setHours(23, 59, 59, 999)

  if (aujourdhui <= dateLimite) {
    return 'OUVERTE'
  }

  const finRetard = new Date(dateLimite)
  finRetard.setDate(finRetard.getDate() + JOURS_RETARD_AVANT_VERROUILLE)
  if (aujourdhui <= finRetard) {
    return 'EN_RETARD'
  }

  return 'VERROUILLEE'
}

/**
 * Calcule la valeur agrégée des saisies selon le mode.
 * - CUMUL : somme des valeurs
 * - MOYENNE : moyenne des valeurs non nulles
 * - DERNIER : dernière valeur dans l'ordre chronologique (annee, mois)
 */
export function calculerAgregation(
  saisies: SaisieMensuelleForAgregation[],
  mode: ModeAgregation
): number {
  const avecValeur = saisies.filter(
    (s) => s.valeur_realisee != null && !Number.isNaN(s.valeur_realisee)
  )
  if (avecValeur.length === 0) return 0

  switch (mode) {
    case 'CUMUL':
      return avecValeur.reduce((sum, s) => sum + (s.valeur_realisee ?? 0), 0)
    case 'MOYENNE': {
      const sum = avecValeur.reduce((sum, s) => sum + (s.valeur_realisee ?? 0), 0)
      return sum / avecValeur.length
    }
    case 'DERNIER': {
      const triees = [...avecValeur].sort(
        (a, b) => b.annee - a.annee || b.mois - a.mois
      )
      return triees[0]?.valeur_realisee ?? 0
    }
    default:
      return 0
  }
}

/**
 * Calcule le taux d'atteinte en %.
 * - Quantitatif / Qualitatif : (realise / cible) * 100
 * - Comportemental : (realise / 4) * 100 (échelle 1 à 4)
 * Plafonné à 150 % maximum.
 */
export function calculerTauxAtteinte(
  realise: number,
  cible: number,
  type: TypeKpi
): number {
  if (cible === 0 && type !== 'COMPORTEMENTAL') return 0
  let taux: number
  if (type === 'COMPORTEMENTAL') {
    taux = (realise / 4) * 100
  } else {
    taux = (realise / cible) * 100
  }
  return Math.min(150, Math.max(0, taux))
}

/**
 * Calcule la cible mensuelle à partir de la cible de période selon le mode d'agrégation.
 */
export function calculerCibleMensuelle(
  ciblePeriode: number,
  modeAgregation: ModeAgregation,
  periode: { mois_debut: number; mois_fin: number },
  _moisCourant: number
): { cibleMois: number; label: string; explication: string } {
  const nbMoisPeriode = periode.mois_fin - periode.mois_debut + 1

  switch (modeAgregation) {
    case 'CUMUL': {
      const cibleMois = ciblePeriode / nbMoisPeriode
      return {
        cibleMois: Math.round(cibleMois * 100) / 100,
        label: `${cibleMois.toFixed(1)} / mois`,
        explication: `${ciblePeriode} ÷ ${nbMoisPeriode} mois`,
      }
    }
    case 'MOYENNE': {
      const cibleMois = Math.round(ciblePeriode * 100) / 100
      return {
        cibleMois,
        label: `${cibleMois.toFixed(1)} ce mois`,
        explication: 'Cible identique chaque mois',
      }
    }
    case 'DERNIER': {
      const cibleMois = Math.round(ciblePeriode * 100) / 100
      return {
        cibleMois,
        label: `Objectif final : ${cibleMois.toFixed(1)}`,
        explication: 'Valeur à atteindre en fin de période',
      }
    }
    default: {
      const cibleMois = Math.round(ciblePeriode * 100) / 100
      return {
        cibleMois,
        label: `${cibleMois.toFixed(1)}`,
        explication: '',
      }
    }
  }
}

/**
 * Calcule la cible cumulée attendue à date (ex: mois 3/6 → 3 × cible mensuelle pour CUMUL).
 */
export function calculerCibleAttenduADate(
  ciblePeriode: number,
  modeAgregation: ModeAgregation,
  periode: { mois_debut: number; mois_fin: number },
  moisCourant: number
): number {
  const nbMoisPeriode = periode.mois_fin - periode.mois_debut + 1
  const moisEcoules = moisCourant - periode.mois_debut + 1

  if (modeAgregation === 'CUMUL') {
    const cibleParMois = ciblePeriode / nbMoisPeriode
    return Math.round(cibleParMois * moisEcoules * 100) / 100
  }

  return ciblePeriode
}

/**
 * Calcule le réalisé cumulé depuis le début de la période.
 * @param inclureBrouillons - si true, inclut OUVERTE et EN_RETARD (pour afficher la progression en temps réel à l'employé)
 */
export function calculerRealiseCumule(
  saisies: SaisieMensuelleForCumul[],
  modeAgregation: ModeAgregation,
  moisCourant: number,
  inclureBrouillons = false
): number {
  const statutsInclus = inclureBrouillons
    ? ['VALIDEE', 'AJUSTEE', 'OUVERTE', 'EN_RETARD']
    : ['VALIDEE', 'AJUSTEE']
  const saisiesValidees = saisies.filter((s) => statutsInclus.includes(s.statut))

  switch (modeAgregation) {
    case 'CUMUL':
      return saisiesValidees.reduce(
        (sum, s) => sum + (s.valeur_realisee ?? 0),
        0
      )
    case 'MOYENNE':
      if (saisiesValidees.length === 0) return 0
      return (
        Math.round(
          (saisiesValidees.reduce((acc, s) => acc + (s.valeur_realisee ?? 0), 0) /
            saisiesValidees.length) *
            100
        ) / 100
      )
    case 'DERNIER': {
      const derniere = [...saisiesValidees].sort(
        (a, b) => b.annee - a.annee || b.mois - a.mois
      )[0]
      return derniere?.valeur_realisee ?? 0
    }
    default:
      return 0
  }
}
