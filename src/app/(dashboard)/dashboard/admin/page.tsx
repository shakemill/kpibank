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
  Gauge,
} from 'lucide-react'

const adminSections = [
  {
    icon: Building2,
    title: "Informations de l'établissement",
    description: 'Nom et logo de la banque',
    details: 'Modifier le nom de l\'établissement, l\'URL du logo et le statut actif.',
    cardClass: 'bg-amber-50/90 dark:bg-amber-950/25 border-amber-200/70 dark:border-amber-800/50',
    iconClass: 'text-amber-700 dark:text-amber-400',
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/50',
    actions: [
      { icon: Edit, label: 'Modifier', tooltip: 'Modifier les informations' },
    ],
  },
  {
    icon: Globe,
    title: "Gestion de l'organisation",
    description: 'Directions, départements/agences et utilisateurs',
    details: 'Gérer la structure des directions, départements/agences et hiérarchies.',
    cardClass: 'bg-sky-50/90 dark:bg-sky-950/25 border-sky-200/70 dark:border-sky-800/50',
    iconClass: 'text-sky-700 dark:text-sky-400',
    iconBgClass: 'bg-sky-100 dark:bg-sky-900/50',
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
    cardClass: 'bg-indigo-50/90 dark:bg-indigo-950/25 border-indigo-200/70 dark:border-indigo-800/50',
    iconClass: 'text-indigo-700 dark:text-indigo-400',
    iconBgClass: 'bg-indigo-100 dark:bg-indigo-900/50',
    actions: [
      { icon: Eye, label: 'Configurer', tooltip: 'Gérer le catalogue KPI' },
    ],
  },
  {
    icon: Gauge,
    title: 'Grille de notation',
    description: 'Seuils, appréciations et commentaires',
    details: 'Paramétrer la grille de notation utilisée pour les scores globaux et les commentaires de performance.',
    cardClass: 'bg-teal-50/90 dark:bg-teal-950/25 border-teal-200/70 dark:border-teal-800/50',
    iconClass: 'text-teal-700 dark:text-teal-400',
    iconBgClass: 'bg-teal-100 dark:bg-teal-900/50',
    actions: [
      { icon: Edit, label: 'Modifier', tooltip: 'Configurer la grille' },
    ],
  },
  {
    icon: Users,
    title: 'Gestion des utilisateurs',
    description: 'Gérer les comptes et permissions',
    details: 'Créer, modifier et supprimer des comptes utilisateurs. Gérer les rôles et les permissions d\'accès.',
    cardClass: 'bg-emerald-50/90 dark:bg-emerald-950/25 border-emerald-200/70 dark:border-emerald-800/50',
    iconClass: 'text-emerald-700 dark:text-emerald-400',
    iconBgClass: 'bg-emerald-100 dark:bg-emerald-900/50',
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
    cardClass: 'bg-slate-50/90 dark:bg-slate-950/25 border-slate-200/70 dark:border-slate-700/50',
    iconClass: 'text-slate-700 dark:text-slate-300',
    iconBgClass: 'bg-slate-100 dark:bg-slate-800/50',
    actions: [
      { icon: Edit, label: 'Modifier', tooltip: 'Modifier les paramètres' },
    ],
  },
  {
    icon: Shield,
    title: 'Sécurité',
    description: 'Configuration de la sécurité',
    details: 'Configurer les politiques de mot de passe, l\'authentification à deux facteurs et les sessions.',
    cardClass: 'bg-rose-50/90 dark:bg-rose-950/25 border-rose-200/70 dark:border-rose-800/50',
    iconClass: 'text-rose-700 dark:text-rose-400',
    iconBgClass: 'bg-rose-100 dark:bg-rose-900/50',
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
    cardClass: 'bg-orange-50/90 dark:bg-orange-950/25 border-orange-200/70 dark:border-orange-800/50',
    iconClass: 'text-orange-700 dark:text-orange-400',
    iconBgClass: 'bg-orange-100 dark:bg-orange-900/50',
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
    cardClass: 'bg-blue-50/90 dark:bg-blue-950/25 border-blue-200/70 dark:border-blue-800/50',
    iconClass: 'text-blue-700 dark:text-blue-400',
    iconBgClass: 'bg-blue-100 dark:bg-blue-900/50',
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
    cardClass: 'bg-cyan-50/90 dark:bg-cyan-950/25 border-cyan-200/70 dark:border-cyan-800/50',
    iconClass: 'text-cyan-700 dark:text-cyan-400',
    iconBgClass: 'bg-cyan-100 dark:bg-cyan-900/50',
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
    cardClass: 'bg-violet-50/90 dark:bg-violet-950/25 border-violet-200/70 dark:border-violet-800/50',
    iconClass: 'text-violet-700 dark:text-violet-400',
    iconBgClass: 'bg-violet-100 dark:bg-violet-900/50',
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
    } else if (sectionTitle === 'Grille de notation') {
      router.push('/dashboard/admin/grille-notation')
    } else if (sectionTitle === 'Audit & Logs') {
      router.push('/dashboard/admin/audit-logs')
    }
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm shrink-0">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Administration</h1>
            <p className="text-muted-foreground mt-0.5">
              Gérer les paramètres et la configuration du système
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {adminSections.map((section, index) => (
            <Card 
              key={index} 
              className={`group hover:shadow-xl transition-all duration-300 cursor-pointer ${section.cardClass} hover:brightness-[0.98] dark:hover:brightness-110`}
              onClick={() => handleCardClick(section.title)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${section.iconBgClass}`}>
                      <section.icon className={`h-5 w-5 ${section.iconClass}`} />
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
