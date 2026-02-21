import { z } from 'zod'

const roleEnum = z.enum(['DG', 'DIRECTEUR', 'CHEF_SERVICE', 'MANAGER', 'EMPLOYE'])

export const directionCreateSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  code: z.string().min(1, 'Le code est requis'),
  description: z.string().optional(),
  etablissementId: z.number().int().positive().optional(),
  responsableId: z.number().int().positive().optional().nullable(),
})

export const directionUpdateSchema = z.object({
  nom: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  responsableId: z.number().int().positive().optional().nullable(),
  actif: z.boolean().optional(),
})

export const serviceCreateSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  code: z.string().min(1, 'Le code est requis'),
  description: z.string().optional(),
  directionId: z.number().int().positive(),
  responsableId: z.number().int().positive().optional().nullable(),
})

export const serviceUpdateSchema = z.object({
  nom: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  directionId: z.number().int().positive().optional(),
  responsableId: z.number().int().positive().optional().nullable(),
  actif: z.boolean().optional(),
})

export const userCreateSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  prenom: z.string().min(1, 'Le prénom est requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().optional().nullable(),
  role: roleEnum,
  directionId: z.number().int().positive().optional().nullable(),
  serviceId: z.number().int().positive().optional().nullable(),
  managerId: z.number().int().positive().optional().nullable(),
})

export const userUpdateSchema = z.object({
  nom: z.string().min(1).optional(),
  prenom: z.string().min(1).optional(),
  email: z.string().email().optional(),
  telephone: z.string().optional().nullable(),
  role: roleEnum.optional(),
  directionId: z.number().int().positive().optional().nullable(),
  serviceId: z.number().int().positive().optional().nullable(),
  managerId: z.number().int().positive().optional().nullable(),
  actif: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

export const parametreUpdateSchema = z.object({
  valeur: z.string(),
  description: z.string().optional().nullable(),
})

export const etablissementUpdateSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis').max(200),
  logo: z.union([z.string().max(500), z.literal('')]).optional().nullable(),
  actif: z.boolean().optional(),
})

export type DirectionCreateInput = z.infer<typeof directionCreateSchema>
export type DirectionUpdateInput = z.infer<typeof directionUpdateSchema>
export type ServiceCreateInput = z.infer<typeof serviceCreateSchema>
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>
export type UserCreateInput = z.infer<typeof userCreateSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>
export type ParametreUpdateInput = z.infer<typeof parametreUpdateSchema>
export type EtablissementUpdateInput = z.infer<typeof etablissementUpdateSchema>
