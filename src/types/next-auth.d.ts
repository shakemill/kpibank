import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      nom: string
      prenom: string
      role: string
      serviceId: number | null
      directionId: number | null
      managerId: number | null
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    nom: string
    prenom: string
    role: string
    serviceId: number | null
    directionId: number | null
    managerId: number | null
  }
}
