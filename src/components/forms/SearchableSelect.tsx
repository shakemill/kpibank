'use client'

import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export type SearchableSelectOption = {
  value: string
  label: string
  searchText?: string
}

interface SearchableSelectProps {
  value: string | null | undefined
  onChange: (value: string | null) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  allowNone?: boolean
  noneLabel?: string
  disabled?: boolean
  minSearchLength?: number
  multiline?: boolean
}

function normaliserRecherche(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Sélectionner…',
  searchPlaceholder = 'Rechercher…',
  emptyMessage = 'Aucun résultat.',
  allowNone = true,
  noneLabel = 'Aucun',
  disabled = false,
  minSearchLength = 1,
  multiline = false,
}: SearchableSelectProps) {
  const selected = options.find((o) => o.value === value)

  const filtrerOptions = (itemValue: string, search: string, keywords?: string[]) => {
    const query = normaliserRecherche(search)
    if (query.length < minSearchLength) return 1
    if (itemValue === '__none__') return 1

    const haystack = normaliserRecherche(
      [itemValue, ...(keywords ?? [])].join(' '),
    )
    return haystack.includes(query) ? 1 : 0
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal px-3',
            multiline ? 'h-auto min-h-9 py-2 items-start whitespace-normal text-left' : 'h-9',
            !selected && 'text-muted-foreground',
          )}
        >
          <span className={cn('text-left', multiline ? 'flex-1 break-words leading-snug pr-2' : 'truncate')}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className={cn('h-4 w-4 shrink-0 opacity-50', multiline && 'mt-0.5')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command filter={filtrerOptions}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {allowNone && (
                <CommandItem
                  value="__none__"
                  keywords={[noneLabel]}
                  onSelect={() => onChange(null)}
                >
                  <Check className={cn('mr-2 h-4 w-4', value == null ? 'opacity-100' : 'opacity-0')} />
                  {noneLabel}
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.searchText ?? option.label]}
                  onSelect={() => onChange(option.value)}
                  className={multiline ? 'items-start py-2.5' : undefined}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === option.value ? 'opacity-100' : 'opacity-0',
                      multiline && 'mt-0.5',
                    )}
                  />
                  <span className={cn(multiline && 'break-words leading-snug')}>{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
