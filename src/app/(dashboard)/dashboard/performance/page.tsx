'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Target, 
  TrendingUp, 
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Star,
  BarChart3
} from 'lucide-react'

interface PerformanceObjective {
  id: string
  title: string
  description: string
  category: 'individuel' | 'equipe' | 'entreprise'
  progress: number
  target: number
  status: 'en_cours' | 'atteint' | 'en_retard' | 'valide'
  deadline: string
  manager: string
}

interface Evaluation {
  id: string
  period: string
  date: string
  score: number
  status: 'complete' | 'en_attente' | 'programmee'
  evaluator: string
  comments?: string
}

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState('objectifs')

  const objectives: PerformanceObjective[] = [
    {
      id: '1',
      title: 'Amélioration du processus de recrutement',
      description: 'Réduire le délai de recrutement de 30 jours à 20 jours',
      category: 'individuel',
      progress: 85,
      target: 100,
      status: 'valide',
      deadline: '2025-03-31',
      manager: 'Marie Kouassi'
    },
    {
      id: '2',
      title: 'Formation équipe RH',
      description: 'Former 100% de l\'équipe RH aux nouveaux outils SIRH',
      category: 'equipe',
      progress: 60,
      target: 100,
      status: 'en_cours',
      deadline: '2025-02-28',
      manager: 'Marie Kouassi'
    },
    {
      id: '3',
      title: 'Taux de satisfaction employés',
      description: 'Atteindre un taux de satisfaction de 90%',
      category: 'entreprise',
      progress: 75,
      target: 90,
      status: 'en_cours',
      deadline: '2025-06-30',
      manager: 'Direction Générale'
    },
    {
      id: '4',
      title: 'Réduction du turnover',
      description: 'Réduire le taux de turnover à moins de 10%',
      category: 'individuel',
      progress: 40,
      target: 100,
      status: 'en_retard',
      deadline: '2025-04-30',
      manager: 'Marie Kouassi'
    }
  ]

  const evaluations: Evaluation[] = [
    {
      id: '1',
      period: 'T4 2024',
      date: '2024-12-20',
      score: 4.2,
      status: 'complete',
      evaluator: 'Marie Kouassi',
      comments: 'Excellente performance, objectifs largement atteints.'
    },
    {
      id: '2',
      period: 'T1 2025',
      date: '2025-02-05',
      score: 0,
      status: 'programmee',
      evaluator: 'Marie Kouassi'
    },
    {
      id: '3',
      period: 'Mi-année 2025',
      date: '2025-06-15',
      score: 0,
      status: 'programmee',
      evaluator: 'Marie Kouassi'
    }
  ]

  const statusConfig = {
    en_cours: {
      label: 'En cours',
      variant: 'default' as const,
      icon: Clock,
      color: 'text-blue-600'
    },
    atteint: {
      label: 'Atteint',
      variant: 'default' as const,
      icon: CheckCircle2,
      color: 'text-green-600'
    },
    en_retard: {
      label: 'En retard',
      variant: 'destructive' as const,
      icon: AlertCircle,
      color: 'text-red-600'
    },
    valide: {
      label: 'Validé',
      variant: 'default' as const,
      icon: CheckCircle2,
      color: 'text-green-600'
    }
  }

  const categoryColors = {
    individuel: 'bg-blue-100 text-blue-700',
    equipe: 'bg-purple-100 text-purple-700',
    entreprise: 'bg-orange-100 text-orange-700'
  }

  const stats = [
    {
      label: 'Objectifs en cours',
      value: objectives.filter(o => o.status === 'en_cours').length,
      icon: Target,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      label: 'Objectifs atteints',
      value: objectives.filter(o => o.status === 'atteint' || o.status === 'valide').length,
      icon: Award,
      color: 'bg-green-50 text-green-600'
    },
    {
      label: 'Taux de réalisation',
      value: `${Math.round(objectives.reduce((acc, o) => acc + o.progress, 0) / objectives.length)}%`,
      icon: TrendingUp,
      color: 'bg-purple-50 text-purple-600'
    },
    {
      label: 'Prochaine évaluation',
      value: '5 fév',
      icon: Calendar,
      color: 'bg-orange-50 text-orange-600'
    }
  ]

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
          <p className="text-muted-foreground mt-1">
            Suivez vos objectifs et évaluations de performance
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`h-12 w-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border shadow-sm">
            <TabsTrigger value="objectifs" className="gap-2">
              <Target className="h-4 w-4" />
              Mes Objectifs
            </TabsTrigger>
            <TabsTrigger value="evaluations" className="gap-2">
              <Star className="h-4 w-4" />
              Évaluations
            </TabsTrigger>
            <TabsTrigger value="kpi" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Indicateurs KPI
            </TabsTrigger>
          </TabsList>

          {/* Objectifs Tab */}
          <TabsContent value="objectifs" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Mes objectifs 2025</h2>
              <Button className="gap-2">
                <Target className="h-4 w-4" />
                Nouvel objectif
              </Button>
            </div>

            <div className="grid gap-4">
              {objectives.map((objective) => {
                const statusInfo = statusConfig[objective.status]
                const StatusIcon = statusInfo.icon
                
                return (
                  <Card key={objective.id} className="border-0 shadow-sm hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-base">{objective.title}</h3>
                            <Badge variant="secondary" className={`text-xs ${categoryColors[objective.category]}`}>
                              {objective.category.charAt(0).toUpperCase() + objective.category.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{objective.description}</p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Échéance: {new Date(objective.deadline).toLocaleDateString('fr-FR')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Target className="h-3.5 w-3.5" />
                              <span>Manager: {objective.manager}</span>
                            </div>
                          </div>
                        </div>

                        <Badge variant={statusInfo.variant} className="gap-1 flex-shrink-0">
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progression</span>
                          <span className="font-medium">{objective.progress}%</span>
                        </div>
                        <Progress value={objective.progress} className="h-2" />
                      </div>

                      <div className="mt-4 flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1">
                          Mettre à jour
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          Voir détails
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Evaluations Tab */}
          <TabsContent value="evaluations" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Historique des évaluations</h2>
            </div>

            <div className="grid gap-4">
              {evaluations.map((evaluation) => {
                const isComplete = evaluation.status === 'complete'
                const isPending = evaluation.status === 'en_attente'
                
                return (
                  <Card key={evaluation.id} className="border-0 shadow-sm hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Star className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{evaluation.period}</h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(evaluation.date).toLocaleDateString('fr-FR', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Évaluateur</span>
                              <span className="font-medium">{evaluation.evaluator}</span>
                            </div>
                            
                            {isComplete && (
                              <>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Note globale</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-2xl font-bold text-primary">{evaluation.score}</span>
                                    <span className="text-muted-foreground">/5</span>
                                  </div>
                                </div>
                                {evaluation.comments && (
                                  <div className="mt-3 p-3 rounded-lg bg-muted/50">
                                    <p className="text-sm italic">"{evaluation.comments}"</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          <div className="mt-4">
                            {isComplete && (
                              <Button variant="outline" size="sm" className="gap-1">
                                Voir le rapport complet
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            )}
                            {isPending && (
                              <Button size="sm" className="gap-1">
                                Commencer l'auto-évaluation
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            )}
                            {evaluation.status === 'programmee' && (
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" />
                                Programmée
                              </Badge>
                            )}
                          </div>
                        </div>

                        {isComplete && (
                          <div className="flex gap-1 ml-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-4 w-4 ${
                                  star <= evaluation.score
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* KPI Tab */}
          <TabsContent value="kpi" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Indicateurs de Performance (KPI)</CardTitle>
                <CardDescription>
                  Vos indicateurs clés pour la période en cours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Section KPI en cours de développement
                  </p>
                  <Button className="mt-4" variant="outline">
                    Renseigner mes KPI
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
