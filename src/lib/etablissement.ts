import { prisma } from '@/lib/prisma'

/**
 * Récupère le nom de l'établissement (pour metadata, emails, etc.).
 * Utilisable côté serveur uniquement.
 */
export async function getEtablissementNom(): Promise<string> {
  try {
    const etab = await prisma.etablissement.findFirst({
      where: { actif: true },
      orderBy: { id: 'asc' },
      select: { nom: true },
    })
    return etab?.nom ?? 'Banque Nationale'
  } catch {
    return 'Banque Nationale'
  }
}
