'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userCreateSchema, userUpdateSchema, type UserCreateInput, type UserUpdateInput } from '@/lib/validations/organisation'
import { normaliserRattachementUtilisateur } from '@/lib/user-org-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { ROLE_OPTIONS } from '@/lib/role-labels'
import { SearchableSelect } from '@/components/forms/SearchableSelect'

type DirectionOption = { id: number; nom: string; code: string }
type ServiceOption = { id: number; nom: string; code: string; directionId: number }
type UserOption = { id: number; nom: string; prenom: string; email: string; serviceId?: number | null; role?: string }

type RattachementMode = 'direction' | 'service'

function initialRattachementMode(defaultValues?: Partial<UserCreateInput>): RattachementMode {
  if (defaultValues?.serviceId) return 'service'
  if (defaultValues?.directionId) return 'direction'
  return 'service'
}

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
      posteOccupe: defaultValues?.posteOccupe ?? '',
      role: defaultValues?.role ?? 'EMPLOYE',
      directionId: defaultValues?.directionId ?? undefined,
      serviceId: defaultValues?.serviceId ?? undefined,
      managerId: defaultValues?.managerId ?? undefined,
    },
  })

  const [rattachementMode, setRattachementMode] = useState<RattachementMode>(() =>
    initialRattachementMode(defaultValues)
  )

  const role = form.watch('role')
  const serviceId = form.watch('serviceId')
  const directionId = form.watch('directionId')
  const showDirectionDirecteur = role === 'DIRECTEUR'
  const showRattachementEmploye = role === 'EMPLOYE' || role === 'MANAGER'
  const showServiceChef = role === 'CHEF_SERVICE'
  const showManager = role === 'EMPLOYE' || role === 'MANAGER'
  const managersList = users.filter((u) => ['MANAGER', 'CHEF_SERVICE'].includes(u.role ?? ''))

  const directionById = useMemo(
    () => new Map(directions.map((d) => [d.id, d])),
    [directions],
  )

  const directionSelectOptions = useMemo(
    () =>
      directions.map((d) => ({
        value: String(d.id),
        label: `${d.nom} (${d.code})`,
        searchText: `${d.nom} ${d.code}`,
      })),
    [directions],
  )

  const serviceSelectOptions = useMemo(
    () =>
      services.map((s) => {
        const direction = directionById.get(s.directionId)
        return {
          value: String(s.id),
          label: `${direction?.nom ?? '—'} / ${s.nom}`,
          searchText: `${direction?.nom ?? ''} ${direction?.code ?? ''} ${s.nom} ${s.code}`,
        }
      }),
    [services, directionById],
  )

  const managersFiltered = useMemo(() => {
    if (rattachementMode === 'service' && serviceId) {
      return managersList.filter((u) => u.serviceId === serviceId || !u.serviceId)
    }
    if (rattachementMode === 'direction' && directionId) {
      const serviceIdsInDirection = new Set(
        services.filter((s) => s.directionId === directionId).map((s) => s.id)
      )
      return managersList.filter(
        (u) => !u.serviceId || serviceIdsInDirection.has(u.serviceId)
      )
    }
    return managersList
  }, [managersList, rattachementMode, serviceId, directionId, services])

  const handleSubmit = (values: UserCreateInput | UserUpdateInput) => {
    const rattachement = normaliserRattachementUtilisateur({
      role: values.role ?? 'EMPLOYE',
      directionId: values.directionId ?? null,
      serviceId: values.serviceId ?? null,
    })
    onSubmit({
      ...values,
      directionId: rattachement.directionId,
      serviceId: rattachement.serviceId,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
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
                <FormLabel>Prénom (optionnel)</FormLabel>
                <FormControl>
                  <Input placeholder="Jean" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        <FormField
          control={form.control}
          name="posteOccupe"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fonction (optionnel)</FormLabel>
              <FormControl>
                <Input placeholder="Ex. Chargé de clientèle" {...field} value={field.value ?? ''} />
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
              <Select onValueChange={(v) => {
                field.onChange(v)
                if (v === 'DIRECTEUR') {
                  form.setValue('serviceId', null)
                  setRattachementMode('service')
                } else if (v === 'CHEF_SERVICE') {
                  form.setValue('directionId', null)
                } else if (v === 'DG') {
                  form.setValue('directionId', null)
                  form.setValue('serviceId', null)
                }
              }} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
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

        {showDirectionDirecteur && (
          <FormField
            control={form.control}
            name="directionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Direction</FormLabel>
                <FormControl>
                  <SearchableSelect
                    value={field.value != null ? String(field.value) : null}
                    onChange={(v) => field.onChange(v === null ? null : parseInt(v, 10))}
                    options={directionSelectOptions}
                    placeholder="Sélectionner une direction"
                    searchPlaceholder="Rechercher une direction…"
                    noneLabel="Aucune"
                    multiline
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {showRattachementEmploye && (
          <div className="space-y-3 rounded-lg border border-border/60 p-4">
            <FormLabel>Rattachement organisationnel</FormLabel>
            <RadioGroup
              value={rattachementMode}
              onValueChange={(v) => {
                const mode = v as RattachementMode
                setRattachementMode(mode)
                if (mode === 'direction') {
                  form.setValue('serviceId', null)
                  form.setValue('managerId', null)
                } else {
                  form.setValue('directionId', null)
                }
              }}
              className="flex flex-col gap-2 sm:flex-row sm:gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="direction" id="rattachement-direction" />
                <Label htmlFor="rattachement-direction" className="font-normal cursor-pointer">
                  Direction (direct)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="service" id="rattachement-service" />
                <Label htmlFor="rattachement-service" className="font-normal cursor-pointer">
                  Département / Agence
                </Label>
              </div>
            </RadioGroup>

            {rattachementMode === 'direction' ? (
              <FormField
                control={form.control}
                name="directionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Direction</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value != null ? String(field.value) : null}
                        onChange={(v) => field.onChange(v === null ? null : parseInt(v, 10))}
                        options={directionSelectOptions}
                        placeholder="Sélectionner une direction"
                        searchPlaceholder="Rechercher une direction…"
                        noneLabel="Aucune"
                        multiline
                      />
                    </FormControl>
                    <FormDescription>
                      L&apos;utilisateur est rattaché à la direction sans département intermédiaire.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Département / Agence</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value != null ? String(field.value) : null}
                        onChange={(v) => {
                          field.onChange(v === null ? null : parseInt(v, 10))
                          form.setValue('managerId', null)
                        }}
                        options={serviceSelectOptions}
                        placeholder="Sélectionner un département / agence"
                        searchPlaceholder="Rechercher par direction ou département…"
                        noneLabel="Aucun"
                        multiline
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        {showServiceChef && (
          <FormField
            control={form.control}
            name="serviceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Département / Agence</FormLabel>
                <FormControl>
                  <SearchableSelect
                    value={field.value != null ? String(field.value) : null}
                    onChange={(v) => field.onChange(v === null ? null : parseInt(v, 10))}
                    options={serviceSelectOptions}
                    placeholder="Sélectionner un département / agence"
                    searchPlaceholder="Rechercher par direction ou département…"
                    noneLabel="Aucun"
                    multiline
                  />
                </FormControl>
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
                    {managersFiltered.map((u) => (
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

        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
