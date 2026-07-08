import { z } from 'zod'

export const saisieCreateOrUpdateSchema = z.object({
  kpiEmployeId: z.number().int().positive(),
  mois: z.number().int().min(1).max(12),
  annee: z.number().int().min(2020).max(2100),
  valeur_realisee: z.number().optional().nullable(),
  commentaire: z.string().optional().nullable(),
  preuves: z.string().optional().nullable(),
})

export const saisieRejeterSchema = z.object({
  motif: z.string().min(1, 'Le motif de rejet est obligatoire'),
})

export const saisieAjusterSchema = z.object({
  valeur_ajustee: z.number(),
  motif_ajustement: z.string().min(1, 'Le motif d\'ajustement est obligatoire'),
})

export const saisieValiderBatchSchema = z.union([
  z.object({
    ids: z.array(z.number().int().positive()).min(1),
  }),
  z.object({
    employeId: z.number().int().positive(),
    mois: z.number().int().min(1).max(12),
    annee: z.number().int().min(2020).max(2100),
  }),
])

export type SaisieCreateOrUpdateInput = z.infer<typeof saisieCreateOrUpdateSchema>
export type SaisieRejeterInput = z.infer<typeof saisieRejeterSchema>
export type SaisieAjusterInput = z.infer<typeof saisieAjusterSchema>

export const saisieDirectionCreateOrUpdateSchema = z.object({
  kpiDirectionId: z.number().int().positive(),
  mois: z.number().int().min(1).max(12),
  annee: z.number().int().min(2020).max(2100),
  valeur_prevue: z.number().optional().nullable(),
  valeur_realisee: z.number().optional().nullable(),
  commentaire: z.string().optional().nullable(),
})

export const saisieDirectionSoumettreSchema = z.object({
  kpiDirectionId: z.number().int().positive(),
  mois: z.number().int().min(1).max(12),
  annee: z.number().int().min(2020).max(2100),
})

export type SaisieDirectionCreateOrUpdateInput = z.infer<typeof saisieDirectionCreateOrUpdateSchema>
export type SaisieDirectionSoumettreInput = z.infer<typeof saisieDirectionSoumettreSchema>
