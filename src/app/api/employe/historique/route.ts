import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { consolidateEmploye } from '@/lib/consolidation'
import { getNotationGrille } from '@/lib/notation-grille'
import { loadNotationGrilleConfig } from '@/lib/notation-grille-server'
import {
  calculerScoreParMois,
  enrichirRealisationsParMois,
  listerMoisPeriode,
} from '@/lib/kpi-realisations'

const MOIS_LABELS: Record<number, string> = {
  1: 'Janv.', 2: 'Fév.', 3: 'Mars', 4: 'Avr.', 5: 'Mai', 6: 'Juin',
  7: 'Juil.', 8: 'Août', 9: 'Sept.', 10: 'Oct.', 11: 'Nov.', 12: 'Déc.',
}

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
      select: { id: true, code: true, date_debut: true, date_fin: true, mois_debut: true, mois_fin: true, annee: true },
    })

    const periodeSelected = periodes.find((p) => p.id === periodeId)

    let detailPeriode: {
      scoreGlobal: number
      details: { nom: string; type: string; cible: number; realise: number; taux: number; poids: number; statut: string }[]
      appreciation: string
      commentaire: string
    } = { scoreGlobal: 0, details: [], appreciation: '', commentaire: '' }
    let comparaisonVsPrecedent: number | null = null

    try {
      const result = await consolidateEmploye(userId, periodeId)
      const scoreGlobal = Math.round(result.scoreGlobal * 100) / 100
      const grilleConfig = await loadNotationGrilleConfig()
      const notation = getNotationGrille(scoreGlobal, grilleConfig)
      const kpiMeta = await prisma.kpiEmploye.findMany({
        where: { employeId: userId, periodeId },
        select: {
          id: true,
          statut: true,
          catalogueKpi: { select: { type: true } },
        },
      })
      const metaById = new Map(kpiMeta.map((k) => [k.id, k]))

      detailPeriode = {
        scoreGlobal,
        appreciation: notation.appreciation,
        commentaire: notation.commentaire,
        details: result.details.map((d) => ({
          nom: d.nom,
          type: metaById.get(d.kpiEmployeId)?.catalogueKpi.type ?? '',
          cible: d.cible,
          realise: Math.round(d.valeurAgregee * 100) / 100,
          taux: Math.round(d.tauxAtteinte * 100) / 100,
          poids: d.poids,
          statut: metaById.get(d.kpiEmployeId)?.statut ?? 'VALIDE',
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

    let scoreParMois: { mois: number; annee: number; label: string; scorePct: number }[] = []
    let moisPeriode: { mois: number; annee: number; label: string }[] = []
    let kpiParMois: {
      kpiEmployeId: number
      nom: string
      cible: number
      unite: string | null
      tauxPeriode: number | null
      realisePeriode: number | null
      realisations_par_mois: {
        mois: number
        valeur: number | null
        statut: string | null
        taux: number | null
      }[]
    }[] = []

    if (periodeSelected) {
      const periodePourReal = {
        mois_debut: periodeSelected.mois_debut,
        mois_fin: periodeSelected.mois_fin,
        annee: periodeSelected.annee,
      }
      moisPeriode = listerMoisPeriode(periodePourReal)

      const kpiEmployes = await prisma.kpiEmploye.findMany({
        where: { employeId: userId, periodeId },
        select: {
          id: true,
          cible: true,
          poids: true,
          catalogueKpi: {
            select: { nom: true, type: true, sens_calcul: true, mode_agregation: true, unite: true },
          },
        },
      })
      const kpiIds = kpiEmployes.map((k) => k.id)
      const saisies = await prisma.saisieMensuelle.findMany({
        where: {
          kpiEmployeId: { in: kpiIds },
          mois: { gte: periodeSelected.mois_debut, lte: periodeSelected.mois_fin },
          annee: periodeSelected.annee,
        },
        select: {
          kpiEmployeId: true,
          mois: true,
          valeur_realisee: true,
          valeur_ajustee: true,
          statut: true,
        },
      })
      const saisiesValidees = saisies.filter((s) => ['VALIDEE', 'AJUSTEE'].includes(s.statut))
      scoreParMois = calculerScoreParMois(kpiEmployes, saisiesValidees, periodePourReal).map(
        (s) => ({
          ...s,
          label: `${MOIS_LABELS[s.mois]} ${s.annee}`,
        })
      )

      const kpiAvecMois = enrichirRealisationsParMois(kpiEmployes, saisies, periodePourReal)
      const detailByNom = new Map(detailPeriode?.details.map((d) => [d.nom, d]) ?? [])
      kpiParMois = kpiAvecMois.map((k) => {
        const detail = detailByNom.get(k.catalogueKpi.nom)
        return {
          kpiEmployeId: k.id,
          nom: k.catalogueKpi.nom,
          cible: k.cible,
          unite: k.catalogueKpi.unite,
          tauxPeriode: detail?.taux ?? null,
          realisePeriode: detail?.realise ?? null,
          realisations_par_mois: k.realisations_par_mois,
        }
      })
    }

    return NextResponse.json({
      periodeId,
      periodeCode: periodeSelected?.code ?? '',
      detailPeriode,
      comparaisonVsPrecedent,
      evolution,
      scoreParMois,
      moisPeriode,
      kpiParMois,
      periodes: periodes.map((p) => ({ id: p.id, code: p.code })),
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
