/**
 * Sanitisation des entrées texte : trim et suppression des balises HTML.
 */
const HTML_REGEX = /<[^>]*>/g

export function sanitizeText(value: unknown): string {
  if (value == null) return ''
  const s = String(value).replace(HTML_REGEX, '').trim()
  return s
}

export function sanitizeOptionalText(value: unknown): string | null {
  if (value == null || value === '') return null
  const s = sanitizeText(value)
  return s === '' ? null : s
}
