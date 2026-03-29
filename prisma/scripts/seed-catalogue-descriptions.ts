/**
 * Remplit la colonne description des KPI catalogue avec de vraies descriptions (pas une reprise du nom).
 * À lancer : pnpm run seed-catalogue-descriptions
 */
import { config } from 'dotenv'
config({ path: '.env' })
config({ path: '.env.local' })

import { PrismaClient } from '../../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/kpi_banque'
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

/** Descriptions explicites par nom de KPI (pas une reprise du nom). */
const DESCRIPTIONS: Record<string, string> = {
  // Seed principal (cat1..cat16)
  'Volume crédits accordés': 'Montant total des crédits accordés sur la période (M MAD).',
  'Nombre de dossiers traités': 'Nombre total de dossiers traités sur la période.',
  'Nombre de nouveaux clients': 'Nombre de nouveaux clients acquis sur la période.',
  'Taux de recouvrement': 'Taux de recouvrement des créances par rapport aux objectifs.',
  'Délai moyen traitement dossier': "Délai moyen entre la réception et le traitement complet d'un dossier (en jours).",
  'Taux de réalisation budgétaire': 'Pourcentage de réalisation par rapport au budget prévu sur la période.',
  'Nombre de reportings remis à temps': 'Nombre de reportings ou rapports remis dans les délais convenus.',
  'Taux de complétion des entretiens': "Part des entretiens annuels ou d'évaluation réalisés dans les délais.",
  "Score moyen de l'équipe": "Score global moyen de l'équipe (taux d'atteinte des objectifs).",
  'Délai moyen de validation saisies': 'Délai moyen entre la soumission et la validation des saisies (en jours).',
  'Satisfaction client': 'Score de satisfaction client issu des enquêtes ou retours (échelle /5).',
  'Qualité des rapports': 'Évaluation qualitative des rapports produits (exhaustivité, clarté, délais).',
  'Maîtrise des outils CRM': "Niveau de maîtrise et d'utilisation des outils CRM au quotidien.",
  'Gestion du risque': "Capacité à identifier, évaluer et maîtriser les risques dans l'activité.",
  'Leadership et communication': 'Capacité à animer, communiquer et fédérer les équipes.',
  'Développement des équipes': "Contribution au développement des compétences et à l'accompagnement des collaborateurs.",
  // getOrCreateCatalogue (cat17..cat31)
  'Disponibilité systèmes': 'Taux de disponibilité des applications et systèmes critiques.',
  'Délai résolution incidents': 'Délai moyen de résolution des incidents (SLA).',
  'Livraison projets dans les délais': 'Part des livraisons réalisées dans les délais prévus.',
  'Satisfaction utilisateurs internes': 'Score de satisfaction des utilisateurs internes des services livrés.',
  'Taux sauvegardes réussies': 'Pourcentage de sauvegardes exécutées et validées avec succès.',
  'Taux bugs post-livraison': 'Part des bugs détectés après livraison par rapport au total des anomalies.',
  'Vélocité équipe (story points)': 'Nombre de story points livrés par sprint (vélocité).',
  'Couverture tests unitaires': 'Pourcentage du code couvert par les tests unitaires.',
  'Score accessibilité Lighthouse': 'Score Lighthouse (performance, accessibilité) des applications.',
  'Tickets N1 traités': 'Nombre de tickets de premier niveau traités sur la période.',
  'Jalons projets livrés': 'Part des jalons projet livrés dans les délais.',
  'Risques identifiés et mitigés': 'Part des risques identifiés pour lesquels une action de mitigation est en place.',
  'Maîtrise outils supervision': "Niveau de maîtrise des outils de monitoring et supervision.",
  'Qualité du code': 'Niveau de qualité du code (revues, bonnes pratiques).',
  'Maîtrise Next.js/TypeScript': 'Niveau de maîtrise des technologies Next.js et TypeScript.',
  // seed-catalogue-kpi (30 KPI)
  'Disponibilité des systèmes': 'Taux de disponibilité des applications critiques.',
  'Incidents résolus dans les délais': 'Part des incidents traités dans le délai contractuel.',
  'Tickets traités par mois': 'Nombre total de tickets traités sur la période.',
  'Délai moyen de résolution (SLA)': 'Temps moyen de résolution des incidents (heures).',
  'Projets livrés à temps': 'Part des projets livrés dans les délais prévus.',
  'Couverture des tests automatisés': 'Pourcentage du code couvert par les tests automatisés.',
  'Satisfaction utilisateurs internes (IT)': 'Score de satisfaction des utilisateurs des services IT.',
  'Qualité du code (revues)': 'Note de qualité issue des revues de code.',
  'Maîtrise des outils de supervision': 'Niveau de maîtrise des outils de monitoring et supervision.',
  'Gestion des priorités et délais': 'Capacité à prioriser et respecter les délais.',
  'Documentation technique à jour': 'Part de la documentation technique maintenue à jour.',
  'Formations techniques réalisées': 'Nombre de sessions de formation réalisées.',
  'Cybersécurité – audits et mises à jour': 'Taux de conformité aux audits et mises à jour de sécurité.',
  'Backups validés et restaurations test': 'Part des sauvegardes validées et restaurations testées.',
  'Collaboration et partage de connaissances': "Niveau de collaboration et de partage au sein de l'équipe.",
  "Chiffre d'affaires réalisé": "Montant total du chiffre d'affaires réalisé sur la période.",
  'Volume de crédits accordés': 'Montant total des crédits accordés (M MAD).',
  'Taux de conversion prospects': 'Part des prospects convertis en clients.',
  'Dossiers traités dans les délais': 'Part des dossiers traités dans les délais convenus.',
  'Réalisation budgétaire': 'Taux de réalisation par rapport au budget prévu.',
  'Satisfaction client (enquêtes)': 'Score de satisfaction client issu des enquêtes.',
  'Qualité du portefeuille clients': 'Évaluation qualitative du portefeuille clients.',
  'Relation client et fidélisation': 'Niveau de relation client et capacité à fidéliser.',
  'Négociation et closing': 'Capacité de négociation et de conclusion des ventes.',
  'Reporting commercial à temps': 'Part des reportings commerciaux remis dans les délais.',
  'Visites clients / rendez-vous': 'Nombre de visites clients ou rendez-vous réalisés.',
  'Prospection et pipeline': 'Nombre de dossiers en pipeline et activité de prospection.',
  'Respect des process commerciaux': 'Niveau de respect des processus et procédures commerciaux.',
}

async function main() {
  const all = await prisma.catalogueKpi.findMany({
    select: { id: true, nom: true, description: true },
  })
  // À mettre à jour : description vide, null, ou égale au nom (reprise du nom)
  const toUpdate = all.filter((row) => {
    const desc = row.description?.trim() ?? ''
    const nom = row.nom?.trim() ?? ''
    return desc === '' || desc === nom
  })
  console.log(`${toUpdate.length} KPI catalogue à mettre à jour (sans description ou description = nom).`)
  if (toUpdate.length === 0) {
    console.log('Aucune mise à jour nécessaire.')
    return
  }
  let updated = 0
  const skippedNoms: string[] = []
  for (const row of toUpdate) {
    const nomTrimmed = row.nom?.trim() ?? row.nom
    const newDescription = DESCRIPTIONS[row.nom] ?? DESCRIPTIONS[nomTrimmed]
    if (!newDescription) {
      skippedNoms.push(row.nom)
      continue
    }
    await prisma.catalogueKpi.update({
      where: { id: row.id },
      data: { description: newDescription },
    })
    updated++
  }
  console.log(`${updated} KPI catalogue mis à jour avec une vraie description.`)
  if (skippedNoms.length > 0) {
    console.log(`${skippedNoms.length} KPI non trouvés dans le dictionnaire (noms exacts en base) :`)
    skippedNoms.forEach((n) => console.log(`  - ${JSON.stringify(n)}`))
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
