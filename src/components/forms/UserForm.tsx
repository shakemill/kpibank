'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userCreateSchema, userUpdateSchema, type UserCreateInput, type UserUpdateInput } from '@/lib/validations/organisation'
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

type DirectionOption = { id: number; nom: string; code: string }
type ServiceOption = { id: number; nom: string; code: string; directionId: number }
type UserOption = { id: number; nom: string; prenom: string; email: string; serviceId?: number | null; role?: string }

const ROLES = [
  { value: 'DG', label: 'DG' },
  { value: 'DIRECTEUR', label: 'Directeur' },
  { value: 'CHEF_SERVICE', label: 'Chef de service' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'EMPLOYE', label: 'Employé' },
] as const

interface UserFormProps {
  defaultValues?: Partial<UserCreateInput & { actif?: boolean; password?: string }>
  directions: DirectionOption[]
  services: ServiceOption[]
  users: UserOption[]
  onSubmit: (values: UserCreateInput | UserUpdateInput) => void | Promise<void>
  isEdit?: boolean
}

export function UserForm({ defaultValues, directions, services, users, onSubmit, isEdit }: UserFormProps) {
  const schema = isEdit ? userUpdateSchema : userCreateSchema
  const form = useForm<UserCreateInput | UserUpdateInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: defaultValues?.nom ?? '',
      prenom: defaultValues?.prenom ?? '',
      email: defaultValues?.email ?? '',
      telephone: defaultValues?.telephone ?? '',
      role: defaultValues?.role ?? 'EMPLOYE',
      directionId: defaultValues?.directionId ?? undefined,
      serviceId: defaultValues?.serviceId ?? undefined,
      managerId: defaultValues?.managerId ?? undefined,
    },
  })

  const role = form.watch('role')
  const serviceId = form.watch('serviceId')
  const showDirection = role === 'DIRECTEUR'
  const showService = ['CHEF_SERVICE', 'MANAGER', 'EMPLOYE'].includes(role ?? '')
  const showManager = ['MANAGER', 'EMPLOYE'].includes(role ?? '')
  const managersList = users.filter((u) => ['MANAGER', 'CHEF_SERVICE'].includes(u.role ?? ''))
  const managersInService = showManager && serviceId
    ? managersList.filter((u) => u.serviceId === serviceId || !u.serviceId)
    : managersList

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
                <Input placeholder="Dupont" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="prenom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prénom</FormLabel>
              <FormControl>
                <Input placeholder="Jean" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="jean.dupont@banque.com" {...field} disabled={isEdit} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="telephone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Téléphone (optionnel)</FormLabel>
              <FormControl>
                <Input placeholder="+237..." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rôle</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {showDirection && (
          <FormField
            control={form.control}
            name="directionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Direction</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === 'none' ? null : (v ? parseInt(v, 10) : null))}
                  value={field.value != null ? String(field.value) : 'none'}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner une direction" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {directions.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.nom} ({d.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {showService && (
          <FormField
            control={form.control}
            name="serviceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service</FormLabel>
                <Select
                  onValueChange={(v) => {
                    field.onChange(v === 'none' ? null : (v ? parseInt(v, 10) : null))
                    form.setValue('managerId', undefined)
                  }}
                  value={field.value != null ? String(field.value) : 'none'}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner un service" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.nom} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {showManager && (
          <FormField
            control={form.control}
            name="managerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Manager (optionnel)</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === 'none' ? null : (v ? parseInt(v, 10) : null))}
                  value={field.value != null ? String(field.value) : 'none'}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionner un manager" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {managersInService.map((u) => (
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
        )}
        {isEdit && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nouveau mot de passe (optionnel)</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Laisser vide pour ne pas changer" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer'}
        </Button>
      </form>
    </Form>
  )
}
