/** Normalise directionId / serviceId selon le rôle (rattachement exclusif). */
export function normaliserRattachementUtilisateur(input: {
  role: string
  directionId?: number | null
  serviceId?: number | null
}): { directionId: number | null; serviceId: number | null } {
  const directionId = input.directionId ?? null
  const serviceId = input.serviceId ?? null

  switch (input.role) {
    case 'DIRECTEUR':
      return { directionId, serviceId: null }
    case 'CHEF_SERVICE':
      return { directionId: null, serviceId }
    case 'EMPLOYE':
    case 'MANAGER':
      if (serviceId != null) return { directionId: null, serviceId }
      if (directionId != null) return { directionId, serviceId: null }
      return { directionId: null, serviceId: null }
    case 'DG':
      return { directionId: null, serviceId: null }
    default:
      return { directionId, serviceId }
  }
}
