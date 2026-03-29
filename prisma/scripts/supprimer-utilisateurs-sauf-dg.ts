/**
 * Supprime tous les utilisateurs dont le rôle n'est pas DG.
 * À lancer : pnpm exec tsx prisma/scripts/supprimer-utilisateurs-sauf-dg.ts
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const dg = await prisma.user.findFirst({
    where: { role: 'DG' },
    select: { id: true },
  })
  if (!dg) {
    throw new Error('Aucun utilisateur DG trouvé. Il doit exister au moins un DG.')
  }
  const dgId = dg.id

  const nonDgIds = await prisma.user.findMany({
    where: { role: { not: 'DG' } },
    select: { id: true },
  })
  const ids = nonDgIds.map((u) => u.id)

  if (ids.length === 0) {
    console.log('Aucun utilisateur à supprimer (tous sont DG).')
    return
  }

  // Réattribuer les FKs Restrict vers le DG pour pouvoir supprimer les utilisateurs
  await prisma.kpiDirection.updateMany({
    where: { creeParId: { in: ids } },
    data: { creeParId: dgId },
  })
  await prisma.kpiService.updateMany({
    where: { creeParId: { in: ids } },
    data: { creeParId: dgId },
  })
  await prisma.kpiEmploye.updateMany({
    where: { assigneParId: { in: ids } },
    data: { assigneParId: dgId },
  })
  await prisma.parametre.updateMany({
    where: { modifieParId: { in: ids } },
    data: { modifieParId: dgId },
  })

  // Enlever les références managerId vers des utilisateurs qu'on va supprimer
  await prisma.user.updateMany({
    where: { managerId: { in: ids } },
    data: { managerId: null },
  })

  const deleted = await prisma.user.deleteMany({
    where: { role: { not: 'DG' } },
  })

  console.log(`${deleted.count} utilisateur(s) supprimé(s). Seuls les DG ont été conservés.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
