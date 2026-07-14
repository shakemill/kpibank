import { access } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'

/**
 * Récupère le nom de l'établissement (pour metadata, emails, etc.).
 * Utilisable côté serveur uniquement.
 */
export async function getEtablissementNom(): Promise<string> {
  const brand = await getEtablissementEmailBrand()
  return brand.nom
}

/** Content-ID utilisé dans les e-mails pour le logo embarqué. */
export const EMAIL_LOGO_CID = 'etablissement-logo'

export type EtablissementEmailBrand = {
  nom: string
  /**
   * src de l'image dans le HTML :
   * - `cid:etablissement-logo` si le fichier est embarqué
   * - URL http(s) absolue en secours
   * - null → afficher le nom en texte
   */
  logoUrl: string | null
}

export type EmailLogoAttachment = {
  filename: string
  path: string
  cid: string
  contentDisposition: 'inline'
  contentType?: string
}

function contentTypeForExt(ext: string): string | undefined {
  const e = ext.toLowerCase().replace(/^\./, '')
  if (e === 'png') return 'image/png'
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg'
  if (e === 'gif') return 'image/gif'
  if (e === 'webp') return 'image/webp'
  return undefined
}

async function fileExists(filepath: string): Promise<boolean> {
  try {
    await access(filepath)
    return true
  } catch {
    return false
  }
}

/** Mappe une valeur logo DB (/logos/x.png) vers un chemin disque sous public/. */
function publicPathFromLogoValue(logo: string): string | null {
  const value = logo.trim()
  if (!value || /^https?:\/\//i.test(value)) return null
  const relative = value.replace(/^\/+/, '')
  // Sécurité : rester dans public/
  if (relative.includes('..')) return null
  return path.join(process.cwd(), 'public', relative)
}

function resolvePublicUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl?.trim()) return null
  const value = pathOrUrl.trim()
  if (/^https?:\/\//i.test(value)) return value
  const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '')
  if (!base) return null
  return `${base}${value.startsWith('/') ? value : `/${value}`}`
}

const FALLBACK_LOGO = path.join(process.cwd(), 'public', 'images', 'bgfi-bank-logo.png')

/**
 * Résout le fichier logo à embarquer dans les e-mails (priorité : logo établissement, sinon logo BGFI).
 */
export async function getEmailLogoAttachment(
  logoFromDb?: string | null
): Promise<EmailLogoAttachment | null> {
  let logo = logoFromDb
  if (logo === undefined) {
    try {
      const etab = await prisma.etablissement.findFirst({
        where: { actif: true },
        orderBy: { id: 'asc' },
        select: { logo: true },
      })
      logo = etab?.logo ?? null
    } catch {
      logo = null
    }
  }

  const candidates: string[] = []
  if (logo) {
    const fromDb = publicPathFromLogoValue(logo)
    if (fromDb) candidates.push(fromDb)
  }
  candidates.push(FALLBACK_LOGO)

  for (const filepath of candidates) {
    if (await fileExists(filepath)) {
      const filename = path.basename(filepath)
      const ext = path.extname(filename)
      return {
        filename,
        path: filepath,
        cid: EMAIL_LOGO_CID,
        contentDisposition: 'inline',
        contentType: contentTypeForExt(ext),
      }
    }
  }
  return null
}

/**
 * Nom + logo pour les e-mails.
 * Préfère un logo embarqué (cid:) pour qu'il s'affiche hors ligne / sans URL publique.
 */
export async function getEtablissementEmailBrand(): Promise<EtablissementEmailBrand> {
  try {
    const etab = await prisma.etablissement.findFirst({
      where: { actif: true },
      orderBy: { id: 'asc' },
      select: { nom: true, logo: true },
    })
    const nom = etab?.nom ?? 'Établissement'
    const attachment = await getEmailLogoAttachment(etab?.logo ?? null)
    if (attachment) {
      return { nom, logoUrl: `cid:${EMAIL_LOGO_CID}` }
    }
    // Secours : URL publique (peu fiable si l'app n'est pas accessible depuis le client mail)
    return {
      nom,
      logoUrl: resolvePublicUrl(etab?.logo ?? null) ?? resolvePublicUrl('/images/bgfi-bank-logo.png'),
    }
  } catch {
    const attachment = await getEmailLogoAttachment(null)
    return {
      nom: 'Établissement',
      logoUrl: attachment ? `cid:${EMAIL_LOGO_CID}` : resolvePublicUrl('/images/bgfi-bank-logo.png'),
    }
  }
}
