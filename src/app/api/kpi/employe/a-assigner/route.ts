import { NextRequest, NextResponse } from 'next/server'
import { getSessionAndRequireManager } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { getCollaborateursAssignables } from '@/lib/assignation-rules'

export async function GET(request: NextRequest) {
  const result = await getSessionAndRequireManager()
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const user = result.session!.user as {
    id?: string
    role?: string
    serviceId?: number | null
    directionId?: number | null
  }
  const assignateurId = parseInt(user.id ?? '', 10)
  if (Number.isNaN(assignateurId)) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const periodeIdParam = searchParams.get('periodeId')

  let periodeId: number | null = null
  if (periodeIdParam) {
    const parsed = parseInt(periodeIdParam, 10)
    if (!Number.isNaN(parsed)) periodeId = parsed
  }
  if (periodeId == null) {
    const periodeActive = await prisma.periode.findFirst({
      where: { statut: 'EN_COURS', actif: true },
      select: { id: true },
    })
    periodeId = periodeActive?.id ?? null
  }
  if (periodeId == null) {
    return NextResponse.json({
      collaborateurs: [],
      grouped: {},
      periodeId: null,
      message: 'Aucune période active',
    })
  }

  const collaborateurs = await getCollaborateursAssignables({
    id: assignateurId,
    role: user.role ?? '',
    serviceId: user.serviceId ?? null,
    directionId: user.directionId ?? null,
  })

  if (collaborateurs.length === 0) {
    return NextResponse.json({
      collaborateurs: [],
      grouped: {
        rattachesDirects: [],
        directeurs: [],
        chefsService: [],
        managers: [],
        employes: [],
      },
      periodeId,
    })
  }

  const ids = collaborateurs.map((c) => c.id)
  const kpiByEmploye = await prisma.kpiEmploye.findMany({
    where: { employeId: { in: ids }, periodeId },
    select: { employeId: true, poids: true, statut: true },
  })

  const byEmploye = new Map<
    number,
    { sommePoids: number; nbKpi: number; statuts: Set<string> }
  >()
  for (const c of collaborateurs) {
    byEmploye.set(c.id, { sommePoids: 0, nbKpi: 0, statuts: new Set() })
  }
  for (const k of kpiByEmploye) {
    const rec = byEmploye.get(k.employeId)
    if (rec) {
      rec.sommePoids += k.poids
      rec.nbKpi += 1
      rec.statuts.add(k.statut)
    }
  }

  type StatutGlobal = 'OK' | 'CONTESTATIONS' | 'EN_ATTENTE' | 'INCOMPLET'
  function statutGlobal(statuts: Set<string>, sommePoids: number): StatutGlobal {
    if (statuts.has('CONTESTE')) return 'CONTESTATIONS'
    if (statuts.has('NOTIFIE') || statuts.has('DRAFT')) return 'EN_ATTENTE'
    const tousValides =
      statuts.size === 1 && (statuts.has('VALIDE') || statuts.has('CLOTURE'))
    const poidsOk = Math.abs(sommePoids - 100) < 0.01
    if (tousValides && poidsOk) return 'OK'
    return 'INCOMPLET'
  }

  const list = collaborateurs.map((c) => {
    const rec = byEmploye.get(c.id) ?? {
      sommePoids: 0,
      nbKpi: 0,
      statuts: new Set<string>(),
    }
    return {
      id: c.id,
      nom: c.nom,
      prenom: c.prenom,
      email: c.email,
      role: c.role,
      serviceId: c.serviceId,
      directionId: c.directionId,
      service: c.service ? { id: c.service.id, nom: c.service.nom, code: c.service.code } : null,
      direction: c.direction ? { id: c.direction.id, nom: c.direction.nom, code: c.direction.code } : null,
      manager: c.manager ? { id: c.manager.id, nom: c.manager.nom, prenom: c.manager.prenom } : null,
      nbKpiAssignes: rec.nbKpi,
      sommePoids: Math.round(rec.sommePoids * 100) / 100,
      poidsOk: Math.abs(rec.sommePoids - 100) < 0.01,
      statutGlobal: statutGlobal(rec.statuts, rec.sommePoids),
    }
  })

  const rattachesDirects = list.filter((c) => c.directionId != null && c.serviceId == null)
  const directeurs = list.filter((c) => c.role === 'DIRECTEUR')
  const chefsService = list.filter((c) => c.role === 'CHEF_SERVICE')
  const managers = list.filter((c) => c.role === 'MANAGER')
  const employes = list.filter((c) => c.role === 'EMPLOYE')

  return NextResponse.json({
    collaborateurs: list,
    grouped: {
      rattachesDirects,
      directeurs,
      chefsService,
      managers,
      employes,
    },
    periodeId,
  })
}
