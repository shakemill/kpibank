import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getSessionAndRequireManager,
  getSessionAndRequireDirecteur,
  getSessionAndRequireDG,
} from '@/lib/api-auth'
import {
  consolidateEmploye,
  consolidateService,
  consolidateDirection,
} from '@/lib/consolidation'
import { isObjectifAtteint } from '@/lib/notation-grille'
import { getCollaborateursAssignables } from '@/lib/assignation-rules'
import { prisma } from '@/lib/prisma'

const VALID_ROLES = ['employe', 'manager', 'directeur', 'dg'] as const
type DashboardRole = (typeof VALID_ROLES)[number]

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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ role: string }> }
) {
  const { role: roleParam } = await context.params
  const role = roleParam?.toLowerCase()
  if (!role || !VALID_ROLES.includes(role as DashboardRole)) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const userRole = (session.user as { role?: string }).role
  const userId = parseInt((session.user as { id?: string }).id ?? '', 10)

  if (role === 'employe') {
    if (userRole !== 'EMPLOYE') {
      return NextResponse.json({ error: 'Accès réservé à l\'employé' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const periodeId = await getPeriodeIdOrDefault(searchParams.get('periodeId'))
    if (periodeId == null) {
      return NextResponse.json(
        { error: 'Aucune période disponible' },
        { status: 404 }
      )
    }
    try {
      const result = await consolidateEmploye(userId, periodeId)
      const periodes = await prisma.periode.findMany({
        where: { actif: true },
        orderBy: [{ annee: 'desc' }, { date_debut: 'desc' }],
        select: { id: true, mois_debut: true, mois_fin: true, annee: true },
        take: 2,
      })
      const prevPeriode = periodes.find((p) => p.id !== periodeId)
      let comparaisonVsPrecedent: number | null = null
      if (prevPeriode) {
        const prevResult = await consolidateEmploye(userId, prevPeriode.id)
        comparaisonVsPrecedent = result.scoreGlobal - prevResult.scoreGlobal
      }
      const evolutionMois: { mois: number; annee: number; label: string; byKpi: Record<string, number> }[] = []
      const periode = await prisma.periode.findUnique({
        where: { id: periodeId },
        select: { id: true, mois_debut: true, mois_fin: true, annee: true },
      })
      if (periode && result.details.length > 0) {
        const MOIS_LABELS: Record<number, string> = {
          1: 'Jan', 2: 'Fév', 3: 'Mar', 4: 'Avr', 5: 'Mai', 6: 'Juin',
          7: 'Juil', 8: 'Août', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Déc',
        }
        const moisPeriode: { mois: number; annee: number }[] = []
        for (let m = periode.mois_debut; m <= periode.mois_fin; m++) {
          moisPeriode.push({ mois: m, annee: periode.annee })
        }
        const last6 = moisPeriode.slice(-6)
        for (const { mois, annee } of last6) {
          const byKpi: Record<string, number> = {}
          for (const d of result.details) {
            const ke = await prisma.kpiEmploye.findFirst({
              where: { employeId: userId, periodeId, catalogueKpi: { nom: d.nom } },
              include: { catalogueKpi: { select: { mode_agregation: true, type: true, sens_calcul: true } } },
            })
            if (!ke) {
              byKpi[d.nom] = 0
              continue
            }
            const saisies = await prisma.saisieMensuelle.findMany({
              where: {
                kpiEmployeId: ke.id,
                mois,
                annee,
                statut: { in: ['VALIDEE', 'AJUSTEE'] },
              },
              select: { valeur_realisee: true, valeur_ajustee: true },
            })
            const val = saisies[0]
              ? (saisies[0].valeur_ajustee ?? saisies[0].valeur_realisee) ?? 0
              : 0
            const { calculerTauxAtteinte } = await import('@/lib/saisie-utils')
            const taux = calculerTauxAtteinte(
              val,
              ke.cible,
              ke.catalogueKpi.type as import('@/lib/saisie-utils').TypeKpi,
              (ke.catalogueKpi.sens_calcul ?? 'DIRECT') as import('@/lib/saisie-utils').SensCalculKpi
            )
            byKpi[d.nom] = taux
          }
          evolutionMois.push({
            mois,
            annee,
            label: `${MOIS_LABELS[mois] ?? mois} ${annee}`,
            byKpi,
          })
        }
      }
      return NextResponse.json({
        ...result,
        comparaisonVsPrecedent,
        evolutionMois,
        periode,
      })
    } catch (e) {
      // #region agent log
      const errMsg = e instanceof Error ? e.message : String(e)
      const errStack = e instanceof Error ? e.stack : undefined
      fetch('http://127.0.0.1:7243/ingest/422b33c5-a92b-402e-9a6b-68ef5ac1298d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/employe:catch',message:'consolidation error',data:{error:errMsg,stack:errStack,userId,periodeId},timestamp:Date.now(),hypothesisId:'H1,H2,H3,H4,H5'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'Erreur consolidation', details: errMsg },
        { status: 500 }
      )
    }
  }

  if (role === 'manager') {
    const managerResult = await getSessionAndRequireManager()
    if (managerResult.error) {
      return NextResponse.json({ error: managerResult.error }, { status: managerResult.status })
    }
    const managerId = parseInt((managerResult.session!.user as { id?: string }).id!, 10)
    const { searchParams } = new URL(request.url)
    const periodeId = await getPeriodeIdOrDefault(searchParams.get('periodeId'))
    if (periodeId == null) {
      return NextResponse.json({ error: 'Aucune période disponible' }, { status: 404 })
    }
    try {
      const collaborateurs = await prisma.user.findMany({
        where: { managerId, role: 'EMPLOYE', actif: true },
        select: { id: true, nom: true, prenom: true },
      })
      const employesData: {
        id: number
        nom: string
        prenom: string
        scoreGlobal: number
        nbKpiValides: number
        nbKpiTotal: number
        saisieMoisCourant: 'Soumise' | 'Validée' | 'Non soumise' | 'N/A'
      }[] = []
      const kpiNoms: string[] = []
      const consolidationByEmploye = new Map<number, Awaited<ReturnType<typeof consolidateEmploye>>>()
      const now = new Date()
      const moisCourant = now.getMonth() + 1
      const anneeCourant = now.getFullYear()
      for (const emp of collaborateurs) {
        const res = await consolidateEmploye(emp.id, periodeId, { includeSoumises: true })
        consolidationByEmploye.set(emp.id, res)
        const nbKpi = res.details.length
        const nbValides = res.details.filter((d) => isObjectifAtteint(d.tauxAtteinte)).length
        const saisie = await prisma.saisieMensuelle.findFirst({
          where: {
            employeId: emp.id,
            mois: moisCourant,
            annee: anneeCourant,
          },
          select: { statut: true },
        })
        let saisieMois: 'Soumise' | 'Validée' | 'Non soumise' | 'N/A' = 'N/A'
        if (saisie) {
          if (saisie.statut === 'VALIDEE' || saisie.statut === 'AJUSTEE') saisieMois = 'Validée'
          else if (saisie.statut === 'SOUMISE') saisieMois = 'Soumise'
          else saisieMois = 'Non soumise'
        } else saisieMois = 'Non soumise'
        employesData.push({
          id: emp.id,
          nom: emp.nom,
          prenom: emp.prenom,
          scoreGlobal: res.scoreGlobal,
          nbKpiValides: nbValides,
          nbKpiTotal: nbKpi,
          saisieMoisCourant: saisieMois,
        })
        for (const d of res.details) {
          if (!kpiNoms.includes(d.nom)) kpiNoms.push(d.nom)
        }
      }
      // Reuse moisCourant/anneeCourant from above (now)
      const employeIds = collaborateurs.map((c) => c.id)
      const nbSoumises = await prisma.saisieMensuelle.count({
        where: {
          employeId: { in: employeIds },
          mois: moisCourant,
          annee: anneeCourant,
          statut: 'SOUMISE',
        },
      })
      const contestations = await prisma.kpiEmploye.count({
        where: {
          employeId: { in: employeIds },
          statut: 'CONTESTE',
        },
      })
      const periodesMois = await prisma.periode.findMany({
        where: { actif: true, mois_debut: { lte: moisCourant }, mois_fin: { gte: moisCourant }, annee: anneeCourant },
        select: { id: true },
        take: 1,
      })
      const periodeIdMois = periodesMois[0]?.id
      let nbManquantes = 0
      if (periodeIdMois) {
        const kpiValides = await prisma.kpiEmploye.findMany({
          where: { employeId: { in: employeIds }, periodeId: periodeIdMois, statut: { in: ['VALIDE', 'CLOTURE'] } },
          select: { employeId: true },
        })
        const employeIdsAvecKpi = [...new Set(kpiValides.map((k) => k.employeId))]
        const saisiesExistantes = await prisma.saisieMensuelle.findMany({
          where: { employeId: { in: employeIdsAvecKpi }, mois: moisCourant, annee: anneeCourant, statut: { notIn: ['MANQUANTE'] } },
          select: { employeId: true },
        })
        const avecSaisie = new Set(saisiesExistantes.map((s) => s.employeId))
        nbManquantes = employeIdsAvecKpi.filter((id) => !avecSaisie.has(id)).length
      }
      const chartData = employesData.map((e) => {
        const res = consolidationByEmploye.get(e.id)
        const row: Record<string, string | number> = {
          employe: `${e.nom} ${e.prenom}`,
          score: e.scoreGlobal,
          ...Object.fromEntries(kpiNoms.map((k) => [k, 0])),
        }
        if (res) {
          for (const d of res.details) {
            row[d.nom] = d.tauxAtteinte
          }
        }
        return row
      })
      return NextResponse.json({
        periodeId,
        employes: employesData,
        nbSaisiesAValider: nbSoumises,
        nbContestations: contestations,
        nbSaisiesManquantes: nbManquantes,
        chartData,
        kpiNoms,
      })
    } catch (e) {
      return NextResponse.json(
        { error: 'Erreur dashboard manager', details: e instanceof Error ? e.message : e },
        { status: 500 }
      )
    }
  }

  if (role === 'directeur') {
    const dirResult = await getSessionAndRequireDirecteur()
    if (dirResult.error) {
      return NextResponse.json({ error: dirResult.error }, { status: dirResult.status })
    }
    const { searchParams } = new URL(request.url)
    const periodeId = await getPeriodeIdOrDefault(searchParams.get('periodeId'))
    if (periodeId == null) {
      return NextResponse.json({ error: 'Aucune période disponible' }, { status: 404 })
    }
    const directionId = dirResult.directionId
    try {
      const directions = directionId
        ? await prisma.direction.findMany({ where: { id: directionId }, select: { id: true, nom: true } })
        : await prisma.direction.findMany({ select: { id: true, nom: true } })
      let scoreDirectionKpis = 0
      let scoreEmployes = 0
      const servicesData: {
        serviceId: number
        serviceNom: string
        tauxAtteinte: number
        nbEmployes: number
        tendance: number | null
      }[] = []
      const heatmapRows: { serviceNom: string; kpi: Record<string, number> }[] = []
      const allKpiNoms: string[] = []
      const employeScoresForTop: { nom: string; prenom: string; score: number }[] = []

      for (const dir of directions) {
        const consRes = await consolidateDirection(dir.id, periodeId)
        if (directions.length === 1) {
          scoreDirectionKpis = consRes.scoreDirectionKpis
          scoreEmployes = consRes.scoreEmployes
        }
      }
      const consolidationsDir = await prisma.consolidationDirection.findMany({
        where: {
          periodeId,
          directionId: directionId ?? { in: directions.map((d) => d.id) },
        },
        select: {
          score_direction_kpis: true,
          score_employes: true,
        },
      })
      if (consolidationsDir.length === 1) {
        scoreDirectionKpis = consolidationsDir[0].score_direction_kpis
        scoreEmployes = consolidationsDir[0].score_employes
      } else if (consolidationsDir.length > 1) {
        scoreDirectionKpis =
          consolidationsDir.reduce((s, c) => s + c.score_direction_kpis, 0) / consolidationsDir.length
        scoreEmployes =
          consolidationsDir.reduce((s, c) => s + c.score_employes, 0) / consolidationsDir.length
      }

      const targetDirIds = directionId ? [directionId] : directions.map((d) => d.id)
      const services = await prisma.service.findMany({
        where: { directionId: { in: targetDirIds } },
        select: { id: true, nom: true, directionId: true },
      })
      const periodes = await prisma.periode.findMany({
        orderBy: [{ annee: 'desc' }, { date_debut: 'desc' }],
        select: { id: true },
        take: 2,
      })
      const prevPeriodeId = periodes.find((p) => p.id !== periodeId)?.id

      for (const svc of services) {
        const cons = await consolidateService(svc.id, periodeId)
        let tendance: number | null = null
        if (prevPeriodeId) {
          await consolidateService(svc.id, prevPeriodeId)
          const prevCons = await prisma.consolidationService.findFirst({
            where: { serviceId: svc.id, periodeId: prevPeriodeId },
            select: { taux_atteinte_moyen: true },
          })
          if (prevCons) tendance = cons.tauxAtteinteMoyen - prevCons.taux_atteinte_moyen
        }
        servicesData.push({
          serviceId: svc.id,
          serviceNom: svc.nom,
          tauxAtteinte: cons.tauxAtteinteMoyen,
          nbEmployes: cons.nbEmployesTotal,
          tendance,
        })
        const kpiEmployesSvc = await prisma.kpiEmploye.findMany({
          where: { kpiService: { serviceId: svc.id }, periodeId },
          include: {
            catalogueKpi: { select: { nom: true } },
            scorePeriodes: { where: { periodeId }, select: { taux_atteinte: true } },
          },
        })
        const kpiRates: Record<string, { sum: number; poids: number }> = {}
        for (const ke of kpiEmployesSvc) {
          const sp = ke.scorePeriodes[0]
          if (sp) {
            const nom = ke.catalogueKpi.nom
            if (!allKpiNoms.includes(nom)) allKpiNoms.push(nom)
            if (!kpiRates[nom]) kpiRates[nom] = { sum: 0, poids: 0 }
            kpiRates[nom].sum += sp.taux_atteinte * ke.poids
            kpiRates[nom].poids += ke.poids
          }
        }
        const kpiRatesFinal: Record<string, number> = {}
        for (const [nom, v] of Object.entries(kpiRates)) {
          kpiRatesFinal[nom] = v.poids > 0 ? v.sum / v.poids : 0
        }
        heatmapRows.push({ serviceNom: svc.nom, kpi: kpiRatesFinal })

        // Score par employé à partir des scorePeriodes déjà chargés (évite N appels consolidateEmploye)
        const scoreByEmploye = new Map<number, { sumPond: number; sumPoids: number }>()
        for (const ke of kpiEmployesSvc) {
          const sp = ke.scorePeriodes[0]
          if (sp) {
            const cur = scoreByEmploye.get(ke.employeId) ?? { sumPond: 0, sumPoids: 0 }
            cur.sumPond += sp.taux_atteinte * ke.poids
            cur.sumPoids += ke.poids
            scoreByEmploye.set(ke.employeId, cur)
          }
        }
        const employes = await prisma.user.findMany({
          where: { serviceId: svc.id, actif: true },
          select: { id: true, nom: true, prenom: true },
        })
        for (const u of employes) {
          const o = scoreByEmploye.get(u.id)
          const score = o && o.sumPoids > 0 ? o.sumPond / o.sumPoids : 0
          employeScoresForTop.push({ nom: u.nom, prenom: u.prenom, score })
        }
      }
      const sorted = [...employeScoresForTop].sort((a, b) => b.score - a.score)
      const top5 = sorted.slice(0, 5)
      const bottom5 = sorted.slice(-5).reverse()

      const now = new Date()
      const moisCourant = now.getMonth() + 1
      const anneeCourant = now.getFullYear()
      const user = dirResult.session!.user as {
        id?: string
        role?: string
        serviceId?: number | null
        directionId?: number | null
      }
      const assignateurId = parseInt(user.id ?? '', 10)
      const collaborateurs = Number.isNaN(assignateurId)
        ? []
        : await getCollaborateursAssignables({
            id: assignateurId,
            role: user.role ?? 'DIRECTEUR',
            serviceId: user.serviceId ?? null,
            directionId: user.directionId ?? directionId ?? null,
          })
      const employeIds = collaborateurs.map((c) => c.id)
      const nbSaisiesAValider =
        employeIds.length === 0
          ? 0
          : await prisma.saisieMensuelle.count({
              where: {
                employeId: { in: employeIds },
                mois: moisCourant,
                annee: anneeCourant,
                statut: 'SOUMISE',
              },
            })
      const nbContestations =
        employeIds.length === 0
          ? 0
          : await prisma.kpiEmploye.count({
              where: {
                employeId: { in: employeIds },
                statut: 'CONTESTE',
              },
            })
      let nbSaisiesManquantes = 0
      const periodesMois = await prisma.periode.findMany({
        where: {
          actif: true,
          mois_debut: { lte: moisCourant },
          mois_fin: { gte: moisCourant },
          annee: anneeCourant,
        },
        select: { id: true },
        take: 1,
      })
      const periodeIdMois = periodesMois[0]?.id
      if (periodeIdMois && employeIds.length > 0) {
        const kpiValides = await prisma.kpiEmploye.findMany({
          where: {
            employeId: { in: employeIds },
            periodeId: periodeIdMois,
            statut: { in: ['VALIDE', 'CLOTURE'] },
          },
          select: { employeId: true },
        })
        const employeIdsAvecKpi = [...new Set(kpiValides.map((k) => k.employeId))]
        const saisiesExistantes = await prisma.saisieMensuelle.findMany({
          where: {
            employeId: { in: employeIdsAvecKpi },
            mois: moisCourant,
            annee: anneeCourant,
            statut: { notIn: ['MANQUANTE'] },
          },
          select: { employeId: true },
        })
        const avecSaisie = new Set(saisiesExistantes.map((s) => s.employeId))
        nbSaisiesManquantes = employeIdsAvecKpi.filter((id) => !avecSaisie.has(id)).length
      }

      return NextResponse.json({
        periodeId,
        scoreDirectionKpis,
        scoreEmployes,
        services: servicesData,
        heatmap: heatmapRows,
        kpiNoms: allKpiNoms,
        top5,
        bottom5,
        nbSaisiesAValider,
        nbSaisiesManquantes,
        nbContestations,
        nbCollaborateurs: employeIds.length,
      })
    } catch (e) {
      return NextResponse.json(
        { error: 'Erreur dashboard directeur', details: e instanceof Error ? e.message : e },
        { status: 500 }
      )
    }
  }

  if (role === 'dg') {
    const dgResult = await getSessionAndRequireDG()
    if (dgResult.error) {
      return NextResponse.json({ error: dgResult.error }, { status: dgResult.status })
    }
    const { searchParams } = new URL(request.url)
    const periodeId = await getPeriodeIdOrDefault(searchParams.get('periodeId'))
    if (periodeId == null) {
      return NextResponse.json({ error: 'Aucune période disponible' }, { status: 404 })
    }
    try {
      const directions = await prisma.direction.findMany({
        where: { actif: true },
        select: { id: true, nom: true },
        orderBy: { nom: 'asc' },
      })
      const directionIds = directions.map((d) => d.id)

      const services = directionIds.length
        ? await prisma.service.findMany({
            where: { directionId: { in: directionIds }, actif: true },
            select: { id: true, nom: true, directionId: true },
            orderBy: { nom: 'asc' },
          })
        : []
      const serviceIds = services.map((s) => s.id)

      const [
        consolidationsDir,
        consolidationsSvc,
        kpiEmployesAll,
        nbPeriodesEnCours,
        directeurs,
        directeursAvecKpi,
      ] = await Promise.all([
        directionIds.length
          ? prisma.consolidationDirection.findMany({
              where: { periodeId, directionId: { in: directionIds } },
              select: {
                directionId: true,
                taux_atteinte_moyen: true,
                score_direction_kpis: true,
                score_employes: true,
              },
            })
          : Promise.resolve([]),
        serviceIds.length
          ? prisma.consolidationService.findMany({
              where: { periodeId, serviceId: { in: serviceIds } },
              select: { serviceId: true, taux_atteinte_moyen: true },
            })
          : Promise.resolve([]),
        serviceIds.length
          ? prisma.kpiEmploye.findMany({
              where: { periodeId, kpiService: { serviceId: { in: serviceIds } } },
              select: {
                employeId: true,
                poids: true,
                kpiService: { select: { serviceId: true } },
                scorePeriodes: { where: { periodeId }, select: { taux_atteinte: true } },
                employe: { select: { nom: true, prenom: true } },
              },
            })
          : Promise.resolve([]),
        prisma.periode.count({
          where: { actif: true, statut: 'EN_COURS' },
        }),
        prisma.user.findMany({
          where: { role: 'DIRECTEUR', actif: true },
          select: { id: true },
        }),
        prisma.kpiEmploye.findMany({
          where: {
            periodeId,
            statut: { in: ['VALIDE', 'CLOTURE'] },
            employe: { role: 'DIRECTEUR', actif: true },
          },
          select: { employeId: true },
        }),
      ])

      const tauxByDirection = new Map(
        consolidationsDir.map((c) => [c.directionId, c.score_employes])
      )
      const scoreDirectionKpisByDirection = new Map(
        consolidationsDir.map((c) => [c.directionId, c.score_direction_kpis])
      )
      const tauxByService = new Map(
        consolidationsSvc.map((c) => [c.serviceId, c.taux_atteinte_moyen])
      )

      type EmpAgg = { sumPond: number; sumPoids: number; nom: string; prenom: string }
      const scoresByService = new Map<number, Map<number, EmpAgg>>()
      for (const ke of kpiEmployesAll) {
        const sp = ke.scorePeriodes[0]
        if (!sp) continue
        const serviceId = ke.kpiService.serviceId
        let byEmploye = scoresByService.get(serviceId)
        if (!byEmploye) {
          byEmploye = new Map()
          scoresByService.set(serviceId, byEmploye)
        }
        const cur = byEmploye.get(ke.employeId)
        if (cur) {
          cur.sumPond += sp.taux_atteinte * ke.poids
          cur.sumPoids += ke.poids
        } else {
          byEmploye.set(ke.employeId, {
            sumPond: sp.taux_atteinte * ke.poids,
            sumPoids: ke.poids,
            nom: ke.employe.nom,
            prenom: ke.employe.prenom,
          })
        }
      }

      const servicesByDirection = new Map<number, typeof services>()
      for (const svc of services) {
        const list = servicesByDirection.get(svc.directionId) ?? []
        list.push(svc)
        servicesByDirection.set(svc.directionId, list)
      }

      const chartDirections = directions.map((d) => ({
        direction: d.nom,
        taux: tauxByDirection.get(d.id) ?? 0,
        scoreDirectionKpis: scoreDirectionKpisByDirection.get(d.id) ?? 0,
      }))

      const drillDown = directions.map((d) => ({
        directionId: d.id,
        directionNom: d.nom,
        taux: tauxByDirection.get(d.id) ?? 0,
        scoreDirectionKpis: scoreDirectionKpisByDirection.get(d.id) ?? 0,
        services: (servicesByDirection.get(d.id) ?? []).map((svc) => {
          const byEmploye = scoresByService.get(svc.id)
          const employes = byEmploye
            ? Array.from(byEmploye.values()).map((o) => ({
                nom: o.nom,
                prenom: o.prenom,
                score: o.sumPoids > 0 ? o.sumPond / o.sumPoids : 0,
              }))
            : []
          return {
            serviceId: svc.id,
            serviceNom: svc.nom,
            taux: tauxByService.get(svc.id) ?? 0,
            employes,
          }
        }),
      }))

      const idsAvecKpi = new Set(directeursAvecKpi.map((k) => k.employeId))
      const nbDirecteursSansKpi = directeurs.filter((d) => !idsAvecKpi.has(d.id)).length
      return NextResponse.json({
        periodeId,
        chartDirections,
        drillDown,
        nbPeriodesEnCours,
        nbDirecteursSansKpi,
      })
    } catch (e) {
      return NextResponse.json(
        { error: 'Erreur dashboard DG', details: e instanceof Error ? e.message : e },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ error: 'Rôle non géré' }, { status: 400 })
}
