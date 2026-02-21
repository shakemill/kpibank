'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useNotifications } from '@/contexts/notification-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Calendar, 
  Banknote, 
  TrendingUp, 
  UserCheck, 
  UserX, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Target,
  ArrowRight,
  Bell,
  X,
  TrendingDown,
  Activity
} from 'lucide-react'

const stats = [
  {
    name: 'KPI renseignés',
    value: '8/12',
    change: '67%',
    icon: Target,
    status: 'warning'
  },
  {
    name: 'Objectifs en cours',
    value: '5',
    change: '3 validés',
    icon: CheckCircle2,
    status: 'success'
  },
  {
    name: 'Retards de saisie',
    value: '2',
    change: 'À rattraper',
    icon: AlertCircle,
    status: 'alert'
  },
]

// Notifications personnalisées pour l'utilisateur
interface UserAlert {
  id: string
  type: 'success' | 'warning' | 'info' | 'urgent'
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
  dismissible: boolean
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const { addNotification } = useNotifications()
  const router = useRouter()
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([])
  const user = session?.user as { prenom?: string; nom?: string; email?: string; id?: string } | undefined
  const displayName = user ? `${user.prenom ?? ''} ${user.nom ?? ''}`.trim() || user.email : ''

  // Alertes personnalisées basées sur le profil utilisateur
  const userAlerts: UserAlert[] = [
    {
      id: 'kpi-reminder',
      type: 'warning',
      icon: Target,
      title: 'Saisie des KPI - Fin de mois',
      description: 'Il vous reste 3 jours pour renseigner vos indicateurs de performance du mois de Janvier 2025.',
      action: {
        label: 'Renseigner mes KPI',
        href: '/dashboard/kpi'
      },
      dismissible: true
    },
    {
      id: 'objective-validated',
      type: 'success',
      icon: CheckCircle2,
      title: 'Objectif validé par votre N+1',
      description: 'Votre objectif "Amélioration du processus de recrutement" a été approuvé par Marie Kouassi.',
      action: {
        label: 'Voir les détails',
        href: '/dashboard/objectives'
      },
      dismissible: true
    },
    {
      id: 'pending-validation',
      type: 'info',
      icon: Clock,
      title: 'Validation en attente',
      description: '2 demandes d\'absence nécessitent votre approbation en tant que responsable.',
      action: {
        label: 'Valider maintenant',
        href: '/dashboard/validation'
      },
      dismissible: false
    },
    {
      id: 'performance-review',
      type: 'urgent',
      icon: AlertCircle,
      title: 'Évaluation de performance',
      description: 'Votre évaluation trimestrielle est programmée pour le 5 février. Préparez votre auto-évaluation.',
      action: {
        label: 'Commencer l\'évaluation',
        href: '/dashboard/performance'
      },
      dismissible: true
    }
  ]

  const activeAlerts = userAlerts.filter(alert => !dismissedAlerts.includes(alert.id))

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (user?.id) {
      addNotification({
        type: 'info',
        title: 'Bienvenue',
        message: `Bon retour, ${displayName || 'utilisateur'} !`,
      })
    }
  }, [user?.id])

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts([...dismissedAlerts, alertId])
  }

  if (status === 'loading' || !session) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenue, {displayName || 'utilisateur'}
        </p>
      </div>

        {/* Stats Grid - KPI Overview */}
        <div className="grid gap-4 lg:grid-cols-3">
          {stats.map((stat) => {
            const statusColors = {
              warning: 'border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50/50',
              success: 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50/50',
              alert: 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50/50'
            }
            const iconBgColors = {
              warning: 'bg-orange-100 text-orange-700',
              success: 'bg-green-100 text-green-700',
              alert: 'bg-red-100 text-red-700'
            }
            return (
              <Card key={stat.name} className={`border-0 shadow-sm hover:shadow-lg transition-all duration-300 ${statusColors[stat.status as keyof typeof statusColors]}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">{stat.name}</p>
                      <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                    </div>
                    <div className={`h-12 w-12 rounded-2xl ${iconBgColors[stat.status as keyof typeof iconBgColors]} flex items-center justify-center shadow-sm`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="font-medium text-muted-foreground">
                      {stat.change}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Alerts personnalisées */}
        {activeAlerts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Mes notifications</h2>
              {activeAlerts.length > 3 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-xs gap-1 hover:bg-accent"
                  onClick={() => router.push('/dashboard/notifications')}
                >
                  Voir toutes mes notifications
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
            {activeAlerts.slice(0, 3).map((alert) => {
              const bgColors = {
                success: 'bg-gradient-to-br from-green-50 to-emerald-50/50',
                warning: 'bg-gradient-to-br from-orange-50 to-amber-50/50',
                info: 'bg-gradient-to-br from-blue-50 to-sky-50/50',
                urgent: 'bg-gradient-to-br from-red-50 to-rose-50/50'
              }
              const iconColors = {
                success: 'bg-green-100 text-green-700',
                warning: 'bg-orange-100 text-orange-700',
                info: 'bg-blue-100 text-blue-700',
                urgent: 'bg-red-100 text-red-700'
              }
              const badgeVariants = {
                success: 'default' as const,
                warning: 'secondary' as const,
                info: 'secondary' as const,
                urgent: 'destructive' as const
              }

              return (
                <Card 
                  key={alert.id} 
                  className={`${bgColors[alert.type]} border-0 shadow-sm hover:shadow-md transition-all duration-300`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`h-12 w-12 rounded-2xl ${iconColors[alert.type]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <alert.icon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm leading-tight">{alert.title}</h3>
                            {alert.type === 'urgent' && (
                              <Badge variant={badgeVariants[alert.type]} className="text-xs px-2 py-0">
                                Urgent
                              </Badge>
                            )}
                          </div>
                          {alert.dismissible && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-white/60 rounded-full flex-shrink-0"
                              onClick={() => dismissAlert(alert.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                          {alert.description}
                        </p>
                        {alert.action && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 text-xs gap-1.5 bg-white/80 hover:bg-white shadow-sm"
                            onClick={() => router.push(alert.action!.href)}
                          >
                            {alert.action.label}
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            </div>
          </div>
        )}

        {/* Recent Activity & Performance Tracking */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50/30">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Mes activités récentes</CardTitle>
                  <CardDescription className="text-xs mt-1">Vos dernières actions et notifications</CardDescription>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { 
                    action: 'Objectif validé', 
                    name: 'Recrutement Q1 approuvé par Marie K.', 
                    time: 'Il y a 2h',
                    type: 'success'
                  },
                  { 
                    action: 'KPI renseignés', 
                    name: 'Taux de satisfaction client: 92%', 
                    time: 'Il y a 5h',
                    type: 'info'
                  },
                  { 
                    action: 'Demande approuvée', 
                    name: 'Congé de Jean Dupont validé', 
                    time: 'Il y a 1 jour',
                    type: 'success'
                  },
                  { 
                    action: 'Évaluation programmée', 
                    name: 'Performance Q4 - 5 février', 
                    time: 'Il y a 2 jours',
                    type: 'warning'
                  },
                ].map((item, index) => {
                  const dotColors = {
                    success: 'bg-green-500',
                    info: 'bg-blue-500',
                    warning: 'bg-orange-500'
                  }
                  return (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/60 transition-colors">
                      <div className={`h-2 w-2 rounded-full mt-2 ${dotColors[item.type as keyof typeof dotColors]} shadow-sm`} />
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{item.action}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{item.time}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50/30">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Progression KPI</CardTitle>
                  <CardDescription className="text-xs mt-1">Suivi mensuel</CardDescription>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Taux de satisfaction client', value: 92, target: 90, status: 'success' },
                  { name: 'Délai de traitement', value: 75, target: 85, status: 'warning' },
                  { name: 'Taux de conversion', value: 88, target: 95, status: 'progress' },
                  { name: 'Qualité de service', value: 95, target: 90, status: 'success' },
                ].map((kpi, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{kpi.name}</span>
                      <span className="text-muted-foreground">{kpi.value}% / {kpi.target}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          kpi.status === 'success' ? 'bg-green-500' : 
                          kpi.status === 'warning' ? 'bg-orange-500' : 
                          'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(kpi.value, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => router.push('/dashboard/performance')}
              >
                Voir tous mes KPI
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
  )
}
