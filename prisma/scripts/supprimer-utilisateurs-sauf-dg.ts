/**
 * Supprime tous les utilisateurs sauf dg@bgfi.com et efface les KPI affectés
 * (périodes, assignations, saisies, scores, consolidations).
 * Le catalogue KPI et la structure organisationnelle sont conservés.
 *
 * À lancer : pnpm run supprimer-utilisateurs-sauf-dg
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const KEEP_EMAIL = 'dg@bgfi.com'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const dg = await prisma.user.findUnique({
    where: { email: KEEP_EMAIL },
    select: { id: true, email: true, nom: true, prenom: true },
  })
  if (!dg) {
    throw new Error(`Utilisateur ${KEEP_EMAIL} introuvable. Créez-le avant d'exécuter ce script.`)
  }

  const others = await prisma.user.findMany({
    where: { email: { not: KEEP_EMAIL } },
    select: { id: true, email: true },
  })
  const otherIds = others.map((u) => u.id)

  console.log(`Conservation : ${dg.prenom} ${dg.nom} (${dg.email})`)
  console.log(`${others.length} utilisateur(s) à supprimer.`)

  // Périodes → cascade KpiDirection, KpiService, KpiEmploye, saisies, scores, consolidations
  const deletedPeriodes = await prisma.periode.deleteMany({})
  console.log(`${deletedPeriodes.count} période(s) supprimée(s) (KPI affectés inclus).`)

  const deletedDirCatalogue = await prisma.directionCatalogueKpi.deleteMany({})
  console.log(`${deletedDirCatalogue.count} liaison(s) direction ↔ catalogue KPI supprimée(s).`)

  if (otherIds.length > 0) {
    await prisma.direction.updateMany({
      where: { responsableId: { in: otherIds } },
      data: { responsableId: null },
    })
    await prisma.service.updateMany({
      where: { responsableId: { in: otherIds } },
      data: { responsableId: null },
    })

    // Garde-fous si des KPI subsistent (FK Restrict)
    await prisma.kpiDirection.updateMany({
      where: { creeParId: { in: otherIds } },
      data: { creeParId: dg.id },
    })
    await prisma.kpiService.updateMany({
      where: { creeParId: { in: otherIds } },
      data: { creeParId: dg.id },
    })
    await prisma.kpiEmploye.updateMany({
      where: { assigneParId: { in: otherIds } },
      data: { assigneParId: dg.id },
    })
    await prisma.parametre.updateMany({
      where: { modifieParId: { in: otherIds } },
      data: { modifieParId: dg.id },
    })

    await prisma.user.updateMany({
      where: { managerId: { in: otherIds } },
      data: { managerId: null },
    })

    const deleted = await prisma.user.deleteMany({
      where: { email: { not: KEEP_EMAIL } },
    })
    console.log(`${deleted.count} utilisateur(s) supprimé(s).`)
  } else {
    console.log('Aucun autre utilisateur à supprimer.')
  }

  await prisma.user.update({
    where: { id: dg.id },
    data: { serviceId: null, directionId: null, managerId: null },
  })

  const remaining = await prisma.user.count()
  console.log(`Terminé. ${remaining} utilisateur(s) en base (${KEEP_EMAIL}).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
