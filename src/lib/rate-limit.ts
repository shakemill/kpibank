/**
 * Rate limiting simple en mémoire (par clé, ex. email ou IP).
 * Max 10 tentatives par minute par défaut.
 */
const store = new Map<string, number[]>()
const WINDOW_MS = 60 * 1000
const MAX_ATTEMPTS = 10

function cleanup(key: string, now: number) {
  const times = store.get(key) ?? []
  const valid = times.filter((t) => now - t < WINDOW_MS)
  if (valid.length === 0) store.delete(key)
  else store.set(key, valid)
  return valid
}

export function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const valid = cleanup(key, now)
  const allowed = valid.length < MAX_ATTEMPTS
  if (allowed) {
    valid.push(now)
    store.set(key, valid)
  }
  return { allowed, remaining: Math.max(0, MAX_ATTEMPTS - valid.length) }
}
