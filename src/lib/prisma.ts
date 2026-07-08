import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })

function createPrismaClient() {
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

/** Recrée le client si le singleton date d'avant une migration récente. */
function isPrismaClientStale(client: PrismaClient): boolean {
  const userDelegate = client.user as unknown as { fields?: Record<string, unknown> }
  if (!('saisieDirection' in client)) return true
  if (userDelegate.fields && !('posteOccupe' in userDelegate.fields)) return true
  return false
}

function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma
  if (existing && !isPrismaClientStale(existing)) {
    return existing
  }
  const client = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }
  return client
}

export const prisma = getPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
