import { NextResponse } from 'next/server'

const DEFAULT_SUCCESS_STATUS = 200
const DEFAULT_ERROR_STATUS = 400

/**
 * Réponse API succès uniforme.
 */
export function apiSuccess<T>(data: T, status: number = DEFAULT_SUCCESS_STATUS) {
  return NextResponse.json(data, { status })
}

/**
 * Réponse API erreur uniforme.
 * message: message utilisateur
 * status: code HTTP (défaut 400)
 * details: optionnel, pour détails techniques (ex. validation)
 */
export function apiError(
  message: string,
  status: number = DEFAULT_ERROR_STATUS,
  details?: unknown
) {
  const body: { error: string; details?: unknown } = { error: message }
  if (details !== undefined) body.details = details
  return NextResponse.json(body, { status })
}
