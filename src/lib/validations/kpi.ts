import { z } from 'zod'

const typeKpiEnum = z.enum(['QUANTITATIF', 'QUALITATIF', 'COMPORTEMENTAL'])
const modeAgregationEnum = z.enum(['CUMUL', 'MOYENNE', 'DERNIER'])
const statutKpiEnum = z.enum(['DRAFT', 'ACTIF', 'CLOTURE'])

export const catalogueKpiCreateSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional().nullable(),
  type: typeKpiEnum,
  unite: z.string().optional().nullable(),
  mode_agregation: modeAgregationEnum,
  actif: z.boolean().optional(),
})

export const catalogueKpiUpdateSchema = z.object({
  nom: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  type: typeKpiEnum.optional(),
  unite: z.string().optional().nullable(),
  mode_agregation: modeAgregationEnum.optional(),
  actif: z.boolean().optional(),
})

export const kpiDirectionCreateSchema = z.object({
  catalogueKpiId: z.number().int().positive(),
  directionId: z.number().int().positive().optional(),
  periodeId: z.number().int().positive(),
  cible: z.number(),
  poids: z.number().min(0).max(100),
  description_complementaire: z.string().optional().nullable(),
})

export const kpiDirectionUpdateSchema = z.object({
  cible: z.number().optional(),
  poids: z.number().min(0).max(100).optional(),
  description_complementaire: z.string().optional().nullable(),
  statut: statutKpiEnum.optional(),
})

export const kpiServiceCreateSchema = z.object({
  catalogueKpiId: z.number().int().positive(),
  serviceId: z.number().int().positive().optional(),
  periodeId: z.number().int().positive(),
  kpiDirectionId: z.number().int().positive().optional().nullable(),
  poids_dans_direction: z.number().min(0).max(100).optional().nullable(),
  cible: z.number(),
  poids: z.number().min(0).max(100),
})

export const kpiServiceUpdateSchema = z.object({
  catalogueKpiId: z.number().int().positive().optional(),
  kpiDirectionId: z.number().int().positive().optional().nullable(),
  poids_dans_direction: z.number().min(0).max(100).optional().nullable(),
  cible: z.number().optional(),
  poids: z.number().min(0).max(100).optional(),
  statut: statutKpiEnum.optional(),
})

export const kpiEmployeCreateSchema = z
  .object({
    employeId: z.number().int().positive(),
    kpiServiceId: z.number().int().positive().optional().nullable(),
    catalogueKpiId: z.number().int().positive().optional(),
    periodeId: z.number().int().positive(),
    cible: z.number(),
    poids: z.number().min(0).max(100),
  })
  .refine((data) => data.kpiServiceId != null || data.catalogueKpiId != null, {
    message: 'kpiServiceId ou catalogueKpiId requis',
    path: ['kpiServiceId'],
  })

export const kpiEmployeUpdateSchema = z.object({
  cible: z.number().optional(),
  poids: z.number().min(0).max(100).optional(),
})

export const kpiEmployeContesterSchema = z.object({
  motif: z.string().min(50, 'Le motif doit contenir au moins 50 caractères'),
})

export const kpiEmployeRepondreContestationSchema = z.object({
  reponse_contestation: z.string().min(1, 'La réponse est requise'),
  action: z.enum(['MAINTENU', 'REVISE']),
  cible: z.number().optional(),
  poids: z.number().min(0).max(100).optional(),
})

export type CatalogueKpiCreateInput = z.infer<typeof catalogueKpiCreateSchema>
export type CatalogueKpiUpdateInput = z.infer<typeof catalogueKpiUpdateSchema>
export type KpiDirectionCreateInput = z.infer<typeof kpiDirectionCreateSchema>
export type KpiDirectionUpdateInput = z.infer<typeof kpiDirectionUpdateSchema>
export type KpiServiceCreateInput = z.infer<typeof kpiServiceCreateSchema>
export type KpiServiceUpdateInput = z.infer<typeof kpiServiceUpdateSchema>
export type KpiEmployeCreateInput = z.infer<typeof kpiEmployeCreateSchema>
export type KpiEmployeUpdateInput = z.infer<typeof kpiEmployeUpdateSchema>
export type KpiEmployeContesterInput = z.infer<typeof kpiEmployeContesterSchema>
export type KpiEmployeRepondreContestationInput = z.infer<typeof kpiEmployeRepondreContestationSchema>
