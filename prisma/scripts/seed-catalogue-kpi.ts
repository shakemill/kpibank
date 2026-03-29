/**
 * Seed la table CatalogueKpi avec 30 KPI (direction informatique et direction commerciale).
 * À lancer : pnpm run seed-catalogue-kpi
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const KPI_CATALOGUE: Array<{
  nom: string
  description?: string
  type: 'QUANTITATIF' | 'QUALITATIF' | 'COMPORTEMENTAL'
  unite: string | null
  mode_agregation: 'CUMUL' | 'MOYENNE' | 'DERNIER'
}> = [
  // —— Direction informatique (IT) ——
  { nom: 'Disponibilité des systèmes', description: 'Taux de disponibilité des applications critiques', type: 'QUANTITATIF', unite: '%', mode_agregation: 'MOYENNE' },
  { nom: 'Incidents résolus dans les délais', description: 'Part des incidents traités dans le délai contractuel', type: 'QUANTITATIF', unite: '%', mode_agregation: 'MOYENNE' },
  { nom: 'Tickets traités par mois', description: 'Nombre total de tickets traités sur la période', type: 'QUANTITATIF', unite: 'tickets', mode_agregation: 'CUMUL' },
  { nom: 'Délai moyen de résolution (SLA)', description: 'Temps moyen de résolution des incidents (heures)', type: 'QUANTITATIF', unite: 'heures', mode_agregation: 'MOYENNE' },
  { nom: 'Projets livrés à temps', description: 'Part des projets livrés dans les délais prévus', type: 'QUANTITATIF', unite: '%', mode_agregation: 'MOYENNE' },
  { nom: 'Couverture des tests automatisés', description: 'Pourcentage du code couvert par les tests automatisés', type: 'QUANTITATIF', unite: '%', mode_agregation: 'DERNIER' },
  { nom: 'Satisfaction utilisateurs internes (IT)', description: 'Score de satisfaction des utilisateurs des services IT', type: 'QUALITATIF', unite: '/5', mode_agregation: 'MOYENNE' },
  { nom: 'Qualité du code (revues)', description: 'Note de qualité issue des revues de code', type: 'QUALITATIF', unite: '/5', mode_agregation: 'MOYENNE' },
  { nom: 'Maîtrise des outils de supervision', description: 'Niveau de maîtrise des outils de monitoring et supervision', type: 'COMPORTEMENTAL', unite: 'niveau/4', mode_agregation: 'DERNIER' },
  { nom: 'Gestion des priorités et délais', description: 'Capacité à prioriser et respecter les délais', type: 'COMPORTEMENTAL', unite: 'niveau/4', mode_agregation: 'DERNIER' },
  { nom: 'Documentation technique à jour', description: 'Part de la documentation technique maintenue à jour', type: 'QUANTITATIF', unite: '%', mode_agregation: 'MOYENNE' },
  { nom: 'Formations techniques réalisées', description: 'Nombre de sessions de formation réalisées', type: 'QUANTITATIF', unite: 'sessions', mode_agregation: 'CUMUL' },
  { nom: 'Cybersécurité – audits et mises à jour', description: 'Taux de conformité aux audits et mises à jour de sécurité', type: 'QUANTITATIF', unite: '%', mode_agregation: 'MOYENNE' },
  { nom: 'Backups validés et restaurations test', description: 'Part des sauvegardes validées et restaurations testées', type: 'QUANTITATIF', unite: '%', mode_agregation: 'MOYENNE' },
  { nom: 'Collaboration et partage de connaissances', description: 'Niveau de collaboration et de partage au sein de l\'équipe', type: 'COMPORTEMENTAL', unite: 'niveau/4', mode_agregation: 'DERNIER' },
  // —— Direction commerciale ——
  { nom: 'Chiffre d\'affaires réalisé', description: 'Montant total du chiffre d\'affaires réalisé sur la période', type: 'QUANTITATIF', unite: 'M MAD', mode_agregation: 'CUMUL' },
  { nom: 'Volume de crédits accordés', description: 'Montant total des crédits accordés (M MAD)', type: 'QUANTITATIF', unite: 'M MAD', mode_agregation: 'CUMUL' },
  { nom: 'Nombre de nouveaux clients', description: 'Nombre de nouveaux clients acquis sur la période', type: 'QUANTITATIF', unite: 'clients', mode_agregation: 'CUMUL' },
  { nom: 'Taux de conversion prospects', description: 'Part des prospects convertis en clients', type: 'QUANTITATIF', unite: '%', mode_agregation: 'MOYENNE' },
  { nom: 'Dossiers traités dans les délais', description: 'Part des dossiers traités dans les délais convenus', type: 'QUANTITATIF', unite: '%', mode_agregation: 'MOYENNE' },
  { nom: 'Taux de recouvrement', description: 'Taux de recouvrement des créances', type: 'QUANTITATIF', unite: '%', mode_agregation: 'MOYENNE' },
  { nom: 'Réalisation budgétaire', description: 'Taux de réalisation par rapport au budget prévu', type: 'QUANTITATIF', unite: '%', mode_agregation: 'MOYENNE' },
  { nom: 'Satisfaction client (enquêtes)', description: 'Score de satisfaction client issu des enquêtes', type: 'QUALITATIF', unite: '/5', mode_agregation: 'MOYENNE' },
  { nom: 'Qualité du portefeuille clients', description: 'Évaluation qualitative du portefeuille clients', type: 'QUALITATIF', unite: '/5', mode_agregation: 'MOYENNE' },
  { nom: 'Relation client et fidélisation', description: 'Niveau de relation client et capacité à fidéliser', type: 'COMPORTEMENTAL', unite: 'niveau/4', mode_agregation: 'DERNIER' },
  { nom: 'Négociation et closing', description: 'Capacité de négociation et de conclusion des ventes', type: 'COMPORTEMENTAL', unite: 'niveau/4', mode_agregation: 'DERNIER' },
  { nom: 'Reporting commercial à temps', description: 'Part des reportings commerciaux remis dans les délais', type: 'QUANTITATIF', unite: '%', mode_agregation: 'MOYENNE' },
  { nom: 'Visites clients / rendez-vous', description: 'Nombre de visites clients ou rendez-vous réalisés', type: 'QUANTITATIF', unite: 'nombre', mode_agregation: 'CUMUL' },
  { nom: 'Prospection et pipeline', description: 'Nombre de dossiers en pipeline et activité de prospection', type: 'QUANTITATIF', unite: 'dossiers', mode_agregation: 'CUMUL' },
  { nom: 'Respect des process commerciaux', description: 'Niveau de respect des processus et procédures commerciaux', type: 'COMPORTEMENTAL', unite: 'niveau/4', mode_agregation: 'DERNIER' },
]

async function main() {
  let created = 0
  for (const kpi of KPI_CATALOGUE) {
    const existing = await prisma.catalogueKpi.findFirst({ where: { nom: kpi.nom } })
    if (existing) continue
    await prisma.catalogueKpi.create({
      data: {
        nom: kpi.nom,
        description: kpi.description ?? null,
        type: kpi.type,
        unite: kpi.unite,
        mode_agregation: kpi.mode_agregation,
        actif: true,
      },
    })
    created++
  }
  console.log(`${created} KPI catalogue créé(s) (${KPI_CATALOGUE.length} au total dans le script).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
