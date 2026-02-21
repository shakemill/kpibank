import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { consolidateEmploye } from '@/lib/consolidation'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const userId = parseInt((session.user as { id?: string }).id ?? '', 10)
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const periodeIdParam = searchParams.get('periodeId')

  let periodeId: number | null = null
  if (periodeIdParam) {
    const id = parseInt(periodeIdParam, 10)
    if (!Number.isNaN(id)) {
      const p = await prisma.periode.findUnique({
        where: { id },
        select: { id: true },
      })
      if (p) periodeId = p.id
    }
  }
  if (periodeId == null) {
    const periodes = await prisma.periode.findMany({
      where: { actif: true },
      orderBy: [{ annee: 'desc' }, { date_debut: 'desc' }],
      select: { id: true, statut: true },
    })
    const enCours = periodes.find((p) => p.statut === 'EN_COURS')
    periodeId = enCours?.id ?? periodes[0]?.id ?? null
  }
  if (periodeId == null) {
    return NextResponse.json({ error: 'Aucune période disponible' }, { status: 404 })
  }

  try {
    const periodes = await prisma.periode.findMany({
      where: { actif: true },
      orderBy: [{ annee: 'asc' }, { date_debut: 'asc' }],
      select: { id: true, code: true, date_debut: true, date_fin: true },
    })

    const periodeSelected = periodes.find((p) => p.id === periodeId)

    let detailPeriode: {
      scoreGlobal: number
      details: { nom: string; type: string; cible: number; realise: number; taux: number; statut: string }[]
    } = { scoreGlobal: 0, details: [] }
    let comparaisonVsPrecedent: number | null = null

    try {
      const result = await consolidateEmploye(userId, periodeId)
      detailPeriode = {
        scoreGlobal: Math.round(result.scoreGlobal * 100) / 100,
        details: result.details.map((d) => ({
          nom: d.nom,
          type: '',
          cible: d.cible,
          realise: Math.round(d.valeurAgregee * 100) / 100,
          taux: Math.round(d.tauxAtteinte * 100) / 100,
          statut: 'VALIDE',
        })),
      }
      const idx = periodes.findIndex((p) => p.id === periodeId)
      if (idx > 0) {
        const prevPeriodeId = periodes[idx - 1].id
        try {
          const prevResult = await consolidateEmploye(userId, prevPeriodeId)
          comparaisonVsPrecedent =
            Math.round((result.scoreGlobal - prevResult.scoreGlobal) * 100) / 100
        } catch {
          // ignore
        }
      }
    } catch {
      // Pas de KPI pour cette période
    }

    const evolution: { periodeId: number; code: string; scoreGlobal: number }[] = []
    for (const p of periodes) {
      const kpiEmployes = await prisma.kpiEmploye.findMany({
        where: { employeId: userId, periodeId: p.id },
        select: { id: true, poids: true },
      })
      if (kpiEmployes.length === 0) {
        evolution.push({ periodeId: p.id, code: p.code, scoreGlobal: 0 })
        continue
      }
      const scorePeriodes = await prisma.scorePeriode.findMany({
        where: {
          kpiEmployeId: { in: kpiEmployes.map((k) => k.id) },
          periodeId: p.id,
        },
        select: { taux_atteinte: true, kpiEmploye: { select: { poids: true } } },
      })
      let totalPoids = 0
      let pondTaux = 0
      for (const sp of scorePeriodes) {
        const poids = sp.kpiEmploye.poids
        totalPoids += poids
        pondTaux += sp.taux_atteinte * poids
      }
      const scoreGlobal = totalPoids > 0 ? Math.round((pondTaux / totalPoids) * 100) / 100 : 0
      evolution.push({ periodeId: p.id, code: p.code, scoreGlobal })
    }

    return NextResponse.json({
      periodeId,
      periodeCode: periodeSelected?.code ?? '',
      detailPeriode,
      comparaisonVsPrecedent,
      evolution,
      periodes: periodes.map((p) => ({ id: p.id, code: p.code })),
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
