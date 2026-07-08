'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_GRILLE_CONFIG,
  type GrilleNiveauConfig,
} from '@/lib/notation-grille-config'
import {
  getNotationGrille,
  getGrilleReference,
  setActiveNotationGrille,
  type NotationGrilleResult,
} from '@/lib/notation-grille'

type NotationGrilleContextValue = {
  config: GrilleNiveauConfig[]
  loading: boolean
  refresh: () => Promise<void>
  getNotation: (taux: number) => NotationGrilleResult
  referenceRows: ReturnType<typeof getGrilleReference>
}

const NotationGrilleContext = createContext<NotationGrilleContextValue | null>(null)

export function NotationGrilleProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<GrilleNiveauConfig[]>(DEFAULT_GRILLE_CONFIG)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/notation-grille')
      if (!res.ok) return
      const data = await res.json()
      const niveaux = (data.niveaux ?? DEFAULT_GRILLE_CONFIG) as GrilleNiveauConfig[]
      setConfig(niveaux)
      setActiveNotationGrille(niveaux)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setActiveNotationGrille(DEFAULT_GRILLE_CONFIG)
    refresh()
  }, [refresh])

  const value = useMemo<NotationGrilleContextValue>(
    () => ({
      config,
      loading,
      refresh,
      getNotation: (taux: number) => getNotationGrille(taux, config),
      referenceRows: getGrilleReference(config),
    }),
    [config, loading, refresh]
  )

  return (
    <NotationGrilleContext.Provider value={value}>
      {children}
    </NotationGrilleContext.Provider>
  )
}

export function useNotationGrille() {
  const ctx = useContext(NotationGrilleContext)
  if (!ctx) {
    return {
      config: DEFAULT_GRILLE_CONFIG,
      loading: false,
      refresh: async () => {},
      getNotation: (taux: number) => getNotationGrille(taux),
      referenceRows: getGrilleReference(),
    }
  }
  return ctx
}
