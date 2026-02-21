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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type UserOption = { id: number; nom: string; prenom: string; email: string }

interface DirectionFormProps {
  defaultValues?: Partial<DirectionCreateInput & { actif?: boolean }>
  users: UserOption[]
  onSubmit: (values: DirectionCreateInput | DirectionUpdateInput) => void | Promise<void>
  isEdit?: boolean
}

export function DirectionForm({ defaultValues, users, onSubmit, isEdit }: DirectionFormProps) {
  const schema = isEdit ? directionUpdateSchema : directionCreateSchema
  const form = useForm<DirectionCreateInput | DirectionUpdateInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: defaultValues?.nom ?? '',
      code: defaultValues?.code ?? '',
      description: defaultValues?.description ?? '',
      responsableId: defaultValues?.responsableId ?? undefined,
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
        <FormField
          control={form.control}
          name="responsableId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsable (optionnel)</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v === 'none' ? null : (v ? parseInt(v, 10) : null))}
                value={field.value != null ? String(field.value) : 'none'}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un responsable" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.prenom} {u.nom} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer'}
        </Button>
      </form>
    </Form>
  )
}
