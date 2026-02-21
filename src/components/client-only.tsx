'use client'

import { useState, useEffect, ReactNode } from 'react'

/**
 * Renders children only after mount on the client.
 * Use to avoid hydration mismatch with components that generate
 * different markup on server vs client (e.g. Radix UI auto-generated IDs).
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <>{fallback}</>
  return <>{children}</>
}
