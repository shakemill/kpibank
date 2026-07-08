export type PorteeKpiValue = 'DIRECTION' | 'SERVICE' | 'INDIVIDUEL'

export const PORTEE_KPI_LABELS: Record<PorteeKpiValue, string> = {
  DIRECTION: 'Direction (entité)',
  SERVICE: 'Département / Agence (entité)',
  INDIVIDUEL: 'Individuel',
}

export function libellerPorteeKpi(portee: string): string {
  return PORTEE_KPI_LABELS[portee as PorteeKpiValue] ?? portee
}

export const PORTEE_KPI_OPTIONS: { value: PorteeKpiValue; label: string }[] = [
  { value: 'DIRECTION', label: PORTEE_KPI_LABELS.DIRECTION },
  { value: 'SERVICE', label: PORTEE_KPI_LABELS.SERVICE },
  { value: 'INDIVIDUEL', label: PORTEE_KPI_LABELS.INDIVIDUEL },
]
