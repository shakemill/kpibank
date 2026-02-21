'use client'

import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Settings,
  Users,
  Shield,
  Database,
  Bell,
  Mail,
  Globe,
  Lock,
  ChevronRight,
  Edit,
  Eye,
  Download,
  ListChecks,
  Building2,
} from 'lucide-react'

const adminSections = [
  {
    icon: Building2,
    title: "Informations de l'établissement",
    description: 'Nom et logo de la banque',
    details: 'Modifier le nom de l\'établissement, l\'URL du logo et le statut actif.',
    actions: [
      { icon: Edit, label: 'Modifier', tooltip: 'Modifier les informations' },
    ],
  },
  {
    icon: Globe,
    title: "Gestion de l'organisation",
    description: 'Directions, services et utilisateurs',
    details: 'Gérer la structure des départements, services et hiérarchies.',
    actions: [
      { icon: Eye, label: 'Voir', tooltip: 'Voir la structure' },
      { icon: Edit, label: 'Modifier', tooltip: 'Modifier la structure' },
    ],
  },
  {
    icon: ListChecks,
    title: 'Catalogue KPI',
    description: 'Indicateurs disponibles pour les directions',
    details: 'Configurer les indicateurs disponibles pour les directions (nom, type, unité, mode d\'agrégation).',
    actions: [
      { icon: Eye, label: 'Configurer', tooltip: 'Gérer le catalogue KPI' },
    ],
  },
  {
    icon: Users,
    title: 'Gestion des utilisateurs',
    description: 'Gérer les comptes et permissions',
    details: 'Créer, modifier et supprimer des comptes utilisateurs. Gérer les rôles et les permissions d\'accès.',
    actions: [
      { icon: Eye, label: 'Voir', tooltip: 'Voir tous les utilisateurs' },
      { icon: Edit, label: 'Modifier', tooltip: 'Modifier les permissions' },
    ],
  },
  {
    icon: Settings,
    title: 'Paramètres Généraux',
    description: 'Configuration du système',
    details: 'Configurer les paramètres généraux du système, langue, devise et format de date.',
    actions: [
      { icon: Edit, label: 'Modifier', tooltip: 'Modifier les paramètres' },
    ],
  },
  {
    icon: Shield,
    title: 'Sécurité',
    description: 'Configuration de la sécurité',
    details: 'Configurer les politiques de mot de passe, l\'authentification à deux facteurs et les sessions.',
    actions: [
      { icon: Settings, label: 'Configurer', tooltip: 'Paramètres de sécurité' },
      { icon: Eye, label: 'Audit', tooltip: 'Voir l\'audit de sécurité' },
    ],
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Configuration des notifications',
    details: 'Gérer les préférences de notifications, alertes et rappels automatiques.',
    actions: [
      { icon: Settings, label: 'Configurer', tooltip: 'Gérer les notifications' },
      { icon: Eye, label: 'Historique', tooltip: 'Voir l\'historique' },
    ],
  },
  {
    icon: Mail,
    title: 'Configuration Email',
    description: 'Paramètres d\'envoi d\'emails',
    details: 'Configurer le serveur SMTP, les modèles d\'email et les notifications par email.',
    actions: [
      { icon: Settings, label: 'SMTP', tooltip: 'Configurer SMTP' },
      { icon: Edit, label: 'Modèles', tooltip: 'Éditer les modèles' },
    ],
  },
  {
    icon: Database,
    title: 'Sauvegarde & Export',
    description: 'Gestion des données',
    details: 'Effectuer des sauvegardes, exporter des données et gérer l\'archivage.',
    actions: [
      { icon: Download, label: 'Sauvegarder', tooltip: 'Créer une sauvegarde' },
      { icon: Eye, label: 'Historique', tooltip: 'Voir les sauvegardes' },
    ],
  },
  {
    icon: Lock,
    title: 'Audit & Logs',
    description: 'Historique des actions',
    details: 'Consulter l\'historique des actions, les logs système et les audits de sécurité.',
    actions: [
      { icon: Eye, label: 'Consulter', tooltip: 'Voir les logs' },
      { icon: Download, label: 'Export', tooltip: 'Exporter les logs' },
    ],
  },
]

export default function AdminPage() {
  const router = useRouter()

  const handleCardClick = (sectionTitle: string) => {
    if (sectionTitle === "Informations de l'établissement") {
      router.push('/etablissement')
    } else if (sectionTitle === "Gestion de l'organisation") {
      router.push('/organisation')
    } else if (sectionTitle === 'Paramètres Généraux') {
      router.push('/parametres')
    } else if (sectionTitle === 'Gestion des utilisateurs') {
      router.push('/organisation?tab=utilisateurs')
    } else if (sectionTitle === 'Catalogue KPI') {
      router.push('/catalogue-kpi')
    }
  }

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
          <p className="text-muted-foreground mt-1">
            Gérer les paramètres et la configuration du système
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {adminSections.map((section, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-xl transition-all duration-300 border-border/50 hover:border-primary/20 cursor-pointer"
              onClick={() => handleCardClick(section.title)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <section.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base leading-tight group-hover:text-primary transition-colors">
                        {section.title}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {section.description}
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {section.details}
                </p>
                <div className="flex gap-2 pt-1">
                  {section.actions.map((action, actionIndex) => (
                    <Button
                      key={actionIndex}
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-2 text-xs hover:bg-primary/10 hover:text-primary transition-colors"
                      title={action.tooltip}
                      onClick={(e) => {
                        e.stopPropagation()
                        // Action handler
                      }}
                    >
                      <action.icon className="h-3.5 w-3.5" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
  )
}
