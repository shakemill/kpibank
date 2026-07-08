import {
  calculerRealiseCumule,
  calculerTauxAtteinte,
  type ModeAgregation,
  type SensCalculKpi,
  type TypeKpi,
} from '@/lib/saisie-utils'

export const MOIS_LABELS: Record<number, string> = {
  1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril', 5: 'Mai', 6: 'Juin',
  7: 'Juillet', 8: 'Août', 9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre',
}

export const MOIS_LABELS_COURT: Record<number, string> = {
  1: 'Janv.', 2: 'Fév.', 3: 'Mars', 4: 'Avr.', 5: 'Mai', 6: 'Juin',
  7: 'Juil.', 8: 'Août', 9: 'Sept.', 10: 'Oct.', 11: 'Nov.', 12: 'Déc.',
}

export type MoisPeriode = { mois: number; annee: number; label: string }

export type RealisationMois = {
  mois: number
  valeur: number | null
  statut: string | null
  taux: number | null
}

export type KpiPourScore = KpiPourRealisation & { poids: number }

export type ScoreMois = MoisPeriode & { scorePct: number }

export type SaisiePourRealisation = {
  kpiEmployeId: number
  mois: number
  valeur_realisee: number | null
  valeur_ajustee: number | null
  statut: string
}

export type PeriodePourRealisation = {
  mois_debut: number
  mois_fin: number
  annee: number
}

export type KpiPourRealisation = {
  id: number
  cible: number
  catalogueKpi: {
    type: string
    mode_agregation?: string | null
    sens_calcul?: string | null
  }
}

export type RealisationsKpi = {
  realise_cumule: number | null
  realise_mois_courant: number | null
  taux_atteinte: number | null
  statut_saisie_mois: string | null
}

export function moisReferenceDansPeriode(periode: PeriodePourRealisation): number {
  const now = new Date()
  let mois = now.getFullYear() === periode.annee ? now.getMonth() + 1 : periode.mois_fin
  mois = Math.min(Math.max(mois, periode.mois_debut), periode.mois_fin)
  return mois
}

export function labelMoisPeriode(periode: PeriodePourRealisation, mois?: number): string {
  const m = mois ?? moisReferenceDansPeriode(periode)
  return `${MOIS_LABELS[m] ?? m} ${periode.annee}`
}

export function listerMoisPeriode(periode: PeriodePourRealisation): MoisPeriode[] {
  const mois: MoisPeriode[] = []
  for (let m = periode.mois_debut; m <= periode.mois_fin; m++) {
    mois.push({
      mois: m,
      annee: periode.annee,
      label: MOIS_LABELS_COURT[m] ?? String(m),
    })
  }
  return mois
}

export function calculerRealisationsParMois<T extends KpiPourRealisation>(
  kpi: T,
  saisies: SaisiePourRealisation[],
  periode: PeriodePourRealisation
): RealisationMois[] {
  const saisiesKpi = saisies.filter((s) => s.kpiEmployeId === kpi.id)
  const type = kpi.catalogueKpi.type as TypeKpi
  const sens = (kpi.catalogueKpi.sens_calcul ?? 'DIRECT') as SensCalculKpi

  return listerMoisPeriode(periode).map(({ mois }) => {
    const saisie = saisiesKpi.find((s) => s.mois === mois)
    const valeur =
      saisie != null ? saisie.valeur_ajustee ?? saisie.valeur_realisee : null
    const taux =
      valeur != null && (kpi.cible > 0 || sens === 'ZERO_DEFAUT')
        ? Math.round(calculerTauxAtteinte(valeur, kpi.cible, type, sens) * 10) / 10
        : null
    return {
      mois,
      valeur,
      statut: saisie?.statut ?? null,
      taux,
    }
  })
}

export function calculerScoreParMois(
  kpis: KpiPourScore[],
  saisies: SaisiePourRealisation[],
  periode: PeriodePourRealisation
): ScoreMois[] {
  const kpisPonderes = kpis.filter((k) => k.poids > 0)
  const usePoids = kpisPonderes.length > 0
  const kpisActifs = usePoids ? kpisPonderes : kpis

  return listerMoisPeriode(periode).map(({ mois, annee, label }) => {
    let sumPonds = 0
    let sumPoids = 0
    let sumTaux = 0
    let countTaux = 0

    for (const kpi of kpisActifs) {
      const saisie = saisies.find((s) => s.kpiEmployeId === kpi.id && s.mois === mois)
      const valeur = saisie ? saisie.valeur_ajustee ?? saisie.valeur_realisee : null
      if (valeur == null || Number.isNaN(valeur)) continue
      const type = kpi.catalogueKpi.type as TypeKpi
      const sens = (kpi.catalogueKpi.sens_calcul ?? 'DIRECT') as SensCalculKpi
      const tauxPct = calculerTauxAtteinte(valeur, kpi.cible, type, sens)

      if (usePoids) {
        sumPonds += (tauxPct / 100) * kpi.poids
        sumPoids += kpi.poids
      } else {
        sumTaux += tauxPct
        countTaux += 1
      }
    }

    const scorePct = usePoids
      ? sumPoids > 0
        ? Math.round((sumPonds / sumPoids) * 1000) / 10
        : 0
      : countTaux > 0
        ? Math.round((sumTaux / countTaux) * 10) / 10
        : 0

    return { mois, annee, label, scorePct }
  })
}

export function enrichirRealisationsParMois<T extends KpiPourRealisation>(
  list: T[],
  saisies: SaisiePourRealisation[],
  periode: PeriodePourRealisation
): Array<T & { realisations_par_mois: RealisationMois[] }> {
  return list.map((kpi) => ({
    ...kpi,
    realisations_par_mois: calculerRealisationsParMois(kpi, saisies, periode),
  }))
}

export function calculerRealisationsKpi<T extends KpiPourRealisation>(
  kpi: T,
  saisies: SaisiePourRealisation[],
  periode: PeriodePourRealisation,
  moisCourant: number
): T & RealisationsKpi {
  const saisiesKpi = saisies.filter((s) => s.kpiEmployeId === kpi.id)
  const saisiesAvecValeur = saisiesKpi
    .map((s) => ({
      mois: s.mois,
      annee: periode.annee,
      valeur: s.valeur_ajustee ?? s.valeur_realisee,
    }))
    .filter((s) => s.valeur != null)

  if (saisiesAvecValeur.length === 0) {
    return {
      ...kpi,
      realise_cumule: null,
      realise_mois_courant: null,
      taux_atteinte: null,
      statut_saisie_mois: null,
    }
  }

  const mode = (kpi.catalogueKpi.mode_agregation ?? 'MOYENNE') as ModeAgregation
  const type = kpi.catalogueKpi.type as TypeKpi
  const sens = (kpi.catalogueKpi.sens_calcul ?? 'DIRECT') as SensCalculKpi
  const saisiesForCumul = saisiesKpi.map((s) => ({
    mois: s.mois,
    annee: periode.annee,
    valeur_realisee: s.valeur_ajustee ?? s.valeur_realisee,
    statut: s.statut,
  }))
  const realiseCumule = calculerRealiseCumule(
    saisiesForCumul,
    mode,
    moisCourant,
    true
  )
  const saisieMois = saisiesKpi.find((s) => s.mois === moisCourant)
  const realiseMois =
    saisieMois != null ? saisieMois.valeur_ajustee ?? saisieMois.valeur_realisee : null
  const taux =
    kpi.cible > 0 || sens === 'ZERO_DEFAUT'
      ? Math.round(calculerTauxAtteinte(realiseCumule, kpi.cible, type, sens) * 10) / 10
      : null

  return {
    ...kpi,
    realise_cumule: Math.round(realiseCumule * 100) / 100,
    realise_mois_courant: realiseMois,
    taux_atteinte: taux,
    statut_saisie_mois: saisieMois?.statut ?? null,
  }
}

export function enrichirRealisationsKpi<T extends KpiPourRealisation>(
  list: T[],
  saisies: SaisiePourRealisation[],
  periode: PeriodePourRealisation,
  moisCourant?: number
): Array<T & RealisationsKpi> {
  const mois = moisCourant ?? moisReferenceDansPeriode(periode)
  return list.map((kpi) => calculerRealisationsKpi(kpi, saisies, periode, mois))
}
