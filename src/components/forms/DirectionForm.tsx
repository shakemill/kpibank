'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { directionCreateSchema, directionUpdateSchema, type DirectionCreateInput, type DirectionUpdateInput } from '@/lib/validations/organisation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

type DirecteurTitulaire = {
  id: number
  nom: string
  prenom: string
  email: string
}

interface DirectionFormProps {
  defaultValues?: Partial<DirectionCreateInput & { actif?: boolean }>
  directeurTitulaire?: DirecteurTitulaire | null
  onSubmit: (values: DirectionCreateInput | DirectionUpdateInput) => void | Promise<void>
  isEdit?: boolean
}

function libellerDirecteurTitulaire(directeur: DirecteurTitulaire | null | undefined): string {
  if (!directeur) return '—'
  const nomComplet = [directeur.prenom, directeur.nom].filter(Boolean).join(' ')
  return `${nomComplet} (${directeur.email})`
}

export function DirectionForm({ defaultValues, directeurTitulaire, onSubmit, isEdit }: DirectionFormProps) {
  const schema = isEdit ? directionUpdateSchema : directionCreateSchema
  const form = useForm<DirectionCreateInput | DirectionUpdateInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: defaultValues?.nom ?? '',
      code: defaultValues?.code ?? '',
      description: defaultValues?.description ?? '',
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom</FormLabel>
              <FormControl>
                <Input placeholder="Direction Commerciale" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input placeholder="DIR_COM" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optionnel)</FormLabel>
              <FormControl>
                <Input placeholder="Description" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {isEdit && (
          <div className="rounded-lg border bg-muted/30 px-3 py-2.5 space-y-1">
            <p className="text-sm font-medium">Directeur titulaire</p>
            <p className="text-sm text-muted-foreground">
              {libellerDirecteurTitulaire(directeurTitulaire)}
            </p>
            <p className="text-xs text-muted-foreground">
              Défini via Organisation → Utilisateurs (rôle Directeur, fonction sans « adjoint »).
            </p>
          </div>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer'}
        </Button>
      </form>
    </Form>
  )
}
