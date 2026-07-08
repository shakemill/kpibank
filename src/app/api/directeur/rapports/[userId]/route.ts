import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDirecteur } from '@/lib/api-auth'
import { canAccessEmployeData } from '@/lib/access-control'
import { prisma } from '@/lib/prisma'
import { consolidateEmploye } from '@/lib/consolidation'
import { getNotationGrille } from '@/lib/notation-grille'
import { loadNotationGrilleConfig } from '@/lib/notation-grille-server'
import {
  calculerScoreParMois,
  enrichirRealisationsParMois,
  listerMoisPeriode,
} from '@/lib/kpi-realisations'

async function getPeriodeIdOrDefault(periodeIdParam: string | null): Promise<number | null> {
  if (periodeIdParam) {
    const id = parseInt(periodeIdParam, 10)
    if (!Number.isNaN(id)) {
      const p = await prisma.periode.findUnique({
        where: { id },
        select: { id: true },
      })
      if (p) return p.id
    }
  }
  const periodes = await prisma.periode.findMany({
    where: { actif: true },
    orderBy: [{ annee: 'desc' }, { date_debut: 'desc' }],
    select: { id: true, statut: true },
  })
  const enCours = periodes.find((p) => p.statut === 'EN_COURS')
  return enCours?.id ?? periodes[0]?.id ?? null
}

const MOIS_LABELS: Record<number, string> = {
  1: 'Janv.', 2: 'Fév.', 3: 'Mars', 4: 'Avr.', 5: 'Mai', 6: 'Juin',
  7: 'Juil.', 8: 'Août', 9: 'Sept.', 10: 'Oct.', 11: 'Nov.', 12: 'Déc.',
}

/**
 * GET /api/directeur/rapports/[userId]?periodeId=
 * Rapport de performance complet pour un collaborateur (direction).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const result = await getSessionAndRequireDirecteur()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const sessionUser = result.session!.user as { id?: string; role?: string; serviceId?: number; directionId?: number; managerId?: number }
  const currentId = parseInt(sessionUser.id ?? '', 10)
  if (Number.isNaN(currentId)) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }

  const userId = parseInt((await context.params).userId, 10)
  if (Number.isNaN(userId)) {
    return NextResponse.json({ error: 'userId invalide' }, { status: 400 })
  }

  const allowed = await canAccessEmployeData(
    {
      id: sessionUser.id!,
      role: sessionUser.role,
      serviceId: sessionUser.serviceId,
      directionId: sessionUser.directionId,
      managerId: sessionUser.managerId,
    },
    userId
  )
  if (!allowed) {
    return NextResponse.json({ error: 'Accès refusé à ce collaborateur' }, { status: 403 })
  }

  const periodeId = await getPeriodeIdOrDefault(request.nextUrl.searchParams.get('periodeId'))
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nom: true, prenom: true, email: true, role: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    let detailPeriode: {
      scoreGlobal: number
      details: { nom: string; type: string; cible: number; realise: number; taux: number; poids: number; statut: string }[]
      appreciation: string
      commentaire: string
    } = { scoreGlobal: 0, details: [], appreciation: '', commentaire: '' }
    let comparaisonVsPrecedent: number | null = null
    const evolution: { periodeId: number; code: string; scoreGlobal: number }[] = []
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

    try {
      const res = await consolidateEmploye(userId, periodeId)
      const scoreGlobal = Math.round(res.scoreGlobal * 100) / 100
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
        details: res.details.map((d) => ({
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
        try {
          const prevRes = await consolidateEmploye(userId, periodes[idx - 1].id)
          comparaisonVsPrecedent = Math.round((res.scoreGlobal - prevRes.scoreGlobal) * 100) / 100
        } catch {
          // ignore
        }
      }
    } catch {
      // Pas de KPI pour cette période
    }

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
      const detailByNom = new Map(detailPeriode.details.map((d) => [d.nom, d]))
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
      user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role },
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
