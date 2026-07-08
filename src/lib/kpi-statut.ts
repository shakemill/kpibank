/** Statuts KPI autorisant la saisie mensuelle des réalisations. */
export const STATUTS_KPI_SAISISSABLES = ['VALIDE', 'CLOTURE', 'MAINTENU', 'REVISE'] as const

export function isKpiSaisissable(statut: string): boolean {
  return (STATUTS_KPI_SAISISSABLES as readonly string[]).includes(statut)
}
