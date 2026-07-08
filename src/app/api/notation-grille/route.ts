import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getSessionAndRequireDG } from '@/lib/api-auth'
import {
  formatNotationLabel,
  getNotationDisplay,
  NIVEAUX_NOTATION,
  type GrilleNiveauConfig,
} from '@/lib/notation-grille-config'
import {
  ensureNotationGrilleDefaults,
  invalidateNotationGrilleCache,
  loadNotationGrilleConfig,
} from '@/lib/notation-grille-server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const niveauSchema = z.object({
  niveau: z.enum(['EXCELLENT', 'TRES_BIEN', 'SATISFAISANT', 'MOYEN', 'INSUFFISANT']),
  ordre: z.number().int().min(1).max(10),
  seuilMin: z.number().min(0).max(200),
  seuilMax: z.number().min(0).max(200).nullable(),
  notationLibelle: z.string().min(1).max(80),
  appreciation: z.string().min(1).max(100),
  commentaire: z.string().min(1).max(500),
})

const updateSchema = z.object({
  niveaux: z.array(niveauSchema).length(5),
})

function serializeNiveaux(config: GrilleNiveauConfig[]) {
  return [...config]
    .sort((a, b) => a.ordre - b.ordre)
    .map((row) => ({
      ...row,
      notation: getNotationDisplay(row),
    }))
}

function validateGrilleCoherence(niveaux: GrilleNiveauConfig[]): string | null {
  const niveauxSet = new Set(niveaux.map((n) => n.niveau))
  if (niveauxSet.size !== NIVEAUX_NOTATION.length) {
    return 'Les 5 niveaux de notation doivent être présents'
  }
  for (const n of niveaux) {
    if (n.seuilMax != null && n.seuilMin > n.seuilMax) {
      return `Seuil invalide pour ${n.niveau} : le minimum doit être ≤ au maximum`
    }
  }
  const sorted = [...niveaux].sort((a, b) => a.ordre - b.ordre)
  for (let i = 0; i < sorted.length - 1; i++) {
    const better = sorted[i]
    const lower = sorted[i + 1]
    if (lower.seuilMax != null && better.seuilMin <= lower.seuilMax) {
      return `Chevauchement entre ${better.niveau} et ${lower.niveau}`
    }
  }
  return null
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  try {
    await ensureNotationGrilleDefaults()
    const config = await loadNotationGrilleConfig()
    return NextResponse.json({ niveaux: serializeNiveaux(config) })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const result = await getSessionAndRequireDG()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const coherenceError = validateGrilleCoherence(parsed.data.niveaux)
  if (coherenceError) {
    return NextResponse.json({ error: coherenceError }, { status: 400 })
  }

  try {
    await prisma.$transaction(
      parsed.data.niveaux.map((n) =>
        prisma.notationGrilleNiveau.update({
          where: { niveau: n.niveau },
          data: {
            ordre: n.ordre,
            seuilMin: n.seuilMin,
            seuilMax: n.seuilMax,
            notationLibelle: n.notationLibelle.trim(),
            appreciation: n.appreciation.trim(),
            commentaire: n.commentaire.trim(),
          },
        })
      )
    )
    invalidateNotationGrilleCache()
    const config = await loadNotationGrilleConfig()
    return NextResponse.json({ niveaux: serializeNiveaux(config) })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour', details: e instanceof Error ? e.message : e },
      { status: 500 }
    )
  }
}
