import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth-middleware'

function middleware(request: NextRequest) {
  return auth(request)
}

export default middleware
export { middleware }

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
