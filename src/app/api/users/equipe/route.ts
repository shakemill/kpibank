import { NextResponse } from 'next/server'
import { getSessionAndRequireManager } from '@/lib/api-auth'
import { getCollaborateursAssignables } from '@/lib/assignation-rules'

export async function GET() {
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
  try {
    const collaborateurs = await getCollaborateursAssignables({
      id: assignateurId,
      role: user.role ?? '',
      serviceId: user.serviceId ?? null,
      directionId: user.directionId ?? null,
    })
    const list = collaborateurs.map((c) => ({
      id: c.id,
      nom: c.nom,
      prenom: c.prenom,
      email: c.email,
      role: c.role,
      serviceId: c.serviceId,
      directionId: c.directionId,
      service: c.service,
      direction: c.direction,
      manager: c.manager,
    }))
    return NextResponse.json(list)
  } catch (e) {
    return NextResponse.json(
      { error: 'Erreur serveur', details: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
