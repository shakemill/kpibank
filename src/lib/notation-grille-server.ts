import {
  DEFAULT_GRILLE_CONFIG,
  type GrilleNiveauConfig,
} from '@/lib/notation-grille-config'
import type { NiveauNotation } from '@/lib/notation-grille'
import { prisma } from '@/lib/prisma'

const CACHE_TTL_MS = 60_000
let cache: { data: GrilleNiveauConfig[]; expiresAt: number } | null = null

function mapRow(row: {
  niveau: string
  ordre: number
  seuilMin: number
  seuilMax: number | null
  notationLibelle: string | null
  appreciation: string
  commentaire: string
}): GrilleNiveauConfig {
  return {
    niveau: row.niveau as NiveauNotation,
    ordre: row.ordre,
    seuilMin: row.seuilMin,
    seuilMax: row.seuilMax,
    notationLibelle: row.notationLibelle,
    appreciation: row.appreciation,
    commentaire: row.commentaire,
  }
}

export function invalidateNotationGrilleCache(): void {
  cache = null
}

export async function loadNotationGrilleConfig(): Promise<GrilleNiveauConfig[]> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.data
  }

  try {
    const rows = await prisma.notationGrilleNiveau.findMany({
      orderBy: { ordre: 'asc' },
    })
    if (rows.length === 0) {
      cache = { data: DEFAULT_GRILLE_CONFIG, expiresAt: Date.now() + CACHE_TTL_MS }
      return DEFAULT_GRILLE_CONFIG
    }
    const data = rows.map(mapRow)
    cache = { data, expiresAt: Date.now() + CACHE_TTL_MS }
    return data
  } catch {
    return DEFAULT_GRILLE_CONFIG
  }
}

export async function ensureNotationGrilleDefaults(): Promise<void> {
  const count = await prisma.notationGrilleNiveau.count()
  if (count > 0) return
  await prisma.notationGrilleNiveau.createMany({
    data: DEFAULT_GRILLE_CONFIG.map((row) => ({
      niveau: row.niveau,
      ordre: row.ordre,
      seuilMin: row.seuilMin,
      seuilMax: row.seuilMax,
      notationLibelle: row.notationLibelle,
      appreciation: row.appreciation,
      commentaire: row.commentaire,
    })),
  })
  invalidateNotationGrilleCache()
}
