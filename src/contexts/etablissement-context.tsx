'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

type EtablissementContextValue = {
  nom: string
  logo: string | null
  loading: boolean
}

const defaultValue: EtablissementContextValue = {
  nom: 'Établissement',
  logo: null,
  loading: true,
}

const EtablissementContext = createContext<EtablissementContextValue>(defaultValue)

export function EtablissementProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<EtablissementContextValue>(defaultValue)

  useEffect(() => {
    let cancelled = false
    fetch('/api/etablissement/public')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setValue({
          nom: data?.nom ?? 'Établissement',
          logo: data?.logo ?? null,
          loading: false,
        })
      })
      .catch(() => {
        if (cancelled) return
        setValue({ ...defaultValue, loading: false })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <EtablissementContext.Provider value={value}>
      {children}
    </EtablissementContext.Provider>
  )
}

export function useEtablissement() {
  return useContext(EtablissementContext)
}
