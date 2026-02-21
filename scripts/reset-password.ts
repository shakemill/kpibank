/**
 * Réinitialise le mot de passe de youssef.benali@bgfi.com à "Password123!"
 * Usage: npx tsx scripts/reset-password.ts
 * (Assurez-vous que PostgreSQL tourne et que DATABASE_URL est dans .env.local)
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as bcrypt from 'bcryptjs'

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const EMAIL = 'youssef.benali@bgfi.com'
const NEW_PASSWORD = 'Password123!'

async function main() {
  const hash = bcrypt.hashSync(NEW_PASSWORD, 10)
  const user = await prisma.user.update({
    where: { email: EMAIL },
    data: { password: hash },
  })
  console.log(`Mot de passe mis à jour pour ${user.email} (id: ${user.id})`)
  console.log(`Vous pouvez vous connecter avec: ${NEW_PASSWORD}`)
}

main()
  .catch((e: { code?: string }) => {
    if (e?.code === 'ECONNREFUSED') {
      console.error(
        '\n❌ Connexion refusée. Démarrez PostgreSQL puis réessayez :\n   brew services start postgresql@15\n'
      )
    } else {
      console.error(e)
    }
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
