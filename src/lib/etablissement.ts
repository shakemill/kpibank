import { prisma } from '@/lib/prisma'

/**
 * Récupère le nom de l'établissement (pour metadata, emails, etc.).
 * Utilisable côté serveur uniquement.
 */
export async function getEtablissementNom(): Promise<string> {
  const brand = await getEtablissementEmailBrand()
  return brand.nom
}

export type EtablissementEmailBrand = {
  nom: string
  /** URL absolue du logo (pour clients mail), ou null */
  logoUrl: string | null
}

function resolvePublicUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl?.trim()) return null
  const value = pathOrUrl.trim()
  if (/^https?:\/\//i.test(value)) return value
  const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
  if (!base) return null
  return `${base}${value.startsWith('/') ? value : `/${value}`}`
}

/**
 * Nom + logo pour les e-mails (logo en URL absolue si NEXTAUTH_URL est défini).
 */
export async function getEtablissementEmailBrand(): Promise<EtablissementEmailBrand> {
  try {
    const etab = await prisma.etablissement.findFirst({
      where: { actif: true },
      orderBy: { id: 'asc' },
      select: { nom: true, logo: true },
    })
    return {
      nom: etab?.nom ?? 'Établissement',
      logoUrl: resolvePublicUrl(etab?.logo ?? null),
    }
  } catch {
    return { nom: 'Établissement', logoUrl: null }
  }
}
