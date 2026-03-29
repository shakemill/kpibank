import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireDirecteur } from '@/lib/api-auth'
import { canAccessEmployeData } from '@/lib/access-control'
import { prisma } from '@/lib/prisma'
import { consolidateEmploye } from '@/lib/consolidation'
import { calculerTauxAtteinte, type TypeKpi } from '@/lib/saisie-utils'

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
      details: { nom: string; type: string; cible: number; realise: number; taux: number; statut: string }[]
    } = { scoreGlobal: 0, details: [] }
    let comparaisonVsPrecedent: number | null = null
    const evolution: { periodeId: number; code: string; scoreGlobal: number }[] = []
    let scoreParMois: { mois: number; annee: number; label: string; scorePct: number }[] = []

    try {
      const res = await consolidateEmploye(userId, periodeId)
      detailPeriode = {
        scoreGlobal: Math.round(res.scoreGlobal * 100) / 100,
        details: res.details.map((d) => ({
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
      const kpiEmployes = await prisma.kpiEmploye.findMany({
        where: { employeId: userId, periodeId },
        select: { id: true, cible: true, poids: true, catalogueKpi: { select: { type: true } } },
      })
      const kpiIds = kpiEmployes.map((k) => k.id)
      const saisies = await prisma.saisieMensuelle.findMany({
        where: {
          kpiEmployeId: { in: kpiIds },
          statut: { in: ['VALIDEE', 'AJUSTEE'] },
          mois: { gte: periodeSelected.mois_debut, lte: periodeSelected.mois_fin },
          annee: periodeSelected.annee,
        },
        select: { kpiEmployeId: true, mois: true, annee: true, valeur_realisee: true, valeur_ajustee: true },
      })
      const moisDebut = periodeSelected.mois_debut
      const moisFin = periodeSelected.mois_fin
      const annee = periodeSelected.annee
      for (let m = moisDebut; m <= moisFin; m++) {
        let sumPonds = 0
        let sumPoids = 0
        for (const ke of kpiEmployes) {
          const s = saisies.find(
            (x) => x.kpiEmployeId === ke.id && x.mois === m && x.annee === annee
          )
          const valeur = s ? (s.valeur_ajustee ?? s.valeur_realisee) : null
          if (valeur == null || Number.isNaN(valeur)) continue
          const typeKpi = (ke.catalogueKpi?.type ?? 'QUANTITATIF') as TypeKpi
          const taux = calculerTauxAtteinte(valeur, ke.cible, typeKpi) / 100
          sumPonds += taux * ke.poids
          sumPoids += ke.poids
        }
        const scorePct = sumPoids > 0 ? Math.round((sumPonds / sumPoids) * 1000) / 10 : 0
        scoreParMois.push({
          mois: m,
          annee,
          label: `${MOIS_LABELS[m]} ${annee}`,
          scorePct,
        })
      }
    }

    return NextResponse.json({
      user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role },
      periodeId,
      periodeCode: periodeSelected?.code ?? '',
      detailPeriode,
      comparaisonVsPrecedent,
      evolution,
      scoreParMois,
      periodes: periodes.map((p) => ({ id: p.id, code: p.code })),
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
