import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-response'
import { getSessionAndRequireDG } from '@/lib/api-auth'

function dateLimiteSaisie(annee: number, moisFin: number, jour: number): Date {
  const moisSuivant = moisFin === 12 ? 1 : moisFin + 1
  const anneeSuivante = moisFin === 12 ? annee + 1 : annee
  return new Date(anneeSuivante, moisSuivant - 1, jour)
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return apiError('Non authentifié', 401)
  try {
    const periodes = await prisma.periode.findMany({
      orderBy: [{ annee: 'desc' }, { date_debut: 'desc' }],
      select: {
        id: true,
        code: true,
        type: true,
        statut: true,
        date_debut: true,
        date_fin: true,
        date_limite_saisie: true,
        actif: true,
        mois_debut: true,
        mois_fin: true,
        annee: true,
      },
    })
    return apiSuccess(periodes)
  } catch (e) {
    return apiError('Erreur serveur', 500, e instanceof Error ? e.message : e)
  }
}

export async function POST(request: NextRequest) {
  const result = await getSessionAndRequireDG()
  if (result.error) return apiError(result.error, result.status)
  try {
    const body = await request.json()
    const type = body.type as string
    const annee = parseInt(body.annee, 10)
    const jourLimite = body.jourLimite != null ? parseInt(body.jourLimite, 10) : null
    if (!['TRIMESTRIEL', 'SEMESTRIEL'].includes(type) || !Number.isInteger(annee) || annee < 2020) {
      return apiError('Données invalides: type TRIMESTRIEL ou SEMESTRIEL, annee requise', 400)
    }
    let mois_debut: number
    let mois_fin: number
    let code: string
    if (type === 'SEMESTRIEL') {
      const semestre = body.semestre === 2 ? 2 : 1
      if (semestre === 1) {
        mois_debut = 1
        mois_fin = 6
        code = `S1-${annee}`
      } else {
        mois_debut = 7
        mois_fin = 12
        code = `S2-${annee}`
      }
    } else {
      const t = body.trimestre === 2 ? 2 : body.trimestre === 3 ? 3 : body.trimestre === 4 ? 4 : 1
      mois_debut = (t - 1) * 3 + 1
      mois_fin = t * 3
      code = `T${t}-${annee}`
    }
    const date_debut = new Date(annee, mois_debut - 1, 1)
    const date_fin = new Date(annee, mois_fin, 0)
    let jour = 10
    if (jourLimite != null && Number.isInteger(jourLimite)) {
      jour = jourLimite
    } else {
      const param = await prisma.parametre.findUnique({
        where: { cle: 'DELAI_SAISIE_JOUR' },
        select: { valeur: true },
      })
      if (param) {
        const v = parseInt(param.valeur, 10)
        if (!Number.isNaN(v)) jour = v
      }
    }
    const date_limite_saisie = dateLimiteSaisie(annee, mois_fin, jour)
    const existing = await prisma.periode.findFirst({
      where: { code },
    })
    if (existing) return apiError('Une période avec ce code existe déjà', 400)
    const periode = await prisma.periode.create({
      data: {
        type: type as 'TRIMESTRIEL' | 'SEMESTRIEL',
        code,
        mois_debut,
        mois_fin,
        annee,
        date_debut,
        date_fin,
        date_limite_saisie,
        statut: 'A_VENIR',
        actif: true,
      },
    })
    return apiSuccess(periode, 201)
  } catch (e) {
    return apiError('Erreur création période', 500, e instanceof Error ? e.message : e)
  }
}
