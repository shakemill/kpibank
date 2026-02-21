import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  calculerAgregation,
  calculerTauxAtteinte,
  type ModeAgregation,
  type TypeKpi,
} from '@/lib/saisie-utils'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const userId = (session.user as { id?: string }).id
  if (!userId) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }
  const userIdNum = parseInt(userId, 10)
  if (Number.isNaN(userIdNum)) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }

  const list = await prisma.kpiEmploye.findMany({
    where: { employeId: userIdNum },
    include: {
      catalogueKpi: true,
      periode: { select: { id: true, code: true, statut: true, mois_debut: true, mois_fin: true, annee: true, date_limite_saisie: true } },
      assignePar: { select: { id: true, nom: true, prenom: true } },
      saisiesMensuelles: {
        orderBy: [{ annee: 'asc' }, { mois: 'asc' }],
        select: { mois: true, annee: true, valeur_realisee: true, statut: true },
      },
    },
    orderBy: [{ periodeId: 'asc' }, { id: 'asc' }],
  })

  const typeKpiMap: Record<string, TypeKpi> = {
    QUANTITATIF: 'QUANTITATIF',
    QUALITATIF: 'QUALITATIF',
    COMPORTEMENTAL: 'COMPORTEMENTAL',
  }
  const modeMap: Record<string, ModeAgregation> = {
    CUMUL: 'CUMUL',
    MOYENNE: 'MOYENNE',
    DERNIER: 'DERNIER',
  }

  const result = list.map((kpi) => {
    const typeKpi = typeKpiMap[kpi.catalogueKpi.type] ?? 'QUANTITATIF'
    const mode = modeMap[kpi.catalogueKpi.mode_agregation] ?? 'MOYENNE'
    const saisiesForAgg = kpi.saisiesMensuelles.map((s) => ({
      mois: s.mois,
      annee: s.annee,
      valeur_realisee: s.valeur_realisee,
    }))
    const valeurAgregee = calculerAgregation(saisiesForAgg, mode)
    const tauxAtteinte = calculerTauxAtteinte(
      valeurAgregee,
      kpi.cible,
      typeKpi
    )

    return {
      id: kpi.id,
      nom: kpi.catalogueKpi.nom,
      type: kpi.catalogueKpi.type,
      unite: kpi.catalogueKpi.unite,
      cible: kpi.cible,
      poids: kpi.poids,
      statut: kpi.statut,
      periode: kpi.periode,
      assignePar: kpi.assignePar
        ? { id: kpi.assignePar.id, nom: kpi.assignePar.nom, prenom: kpi.assignePar.prenom }
        : null,
      saisiesMensuelles: kpi.saisiesMensuelles,
      valeurAgregee: Math.round(valeurAgregee * 100) / 100,
      tauxAtteinte: Math.round(tauxAtteinte * 100) / 100,
    }
  })

  return NextResponse.json({ list: result })
}
