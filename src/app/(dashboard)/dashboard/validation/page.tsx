'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  Target,
  TrendingUp,
  Calendar,
  FileEdit,
  Eye,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  RotateCcw
} from 'lucide-react'

interface ValidationRequest {
  id: string
  type: 'objective' | 'kpi' | 'absence' | 'performance'
  employeeName: string
  employeeMatricule: string
  employeeService: string
  title: string
  description: string
  submittedDate: string
  status: 'pending' | 'approved' | 'rejected' | 'revision'
  priority: 'high' | 'medium' | 'low'
  value?: string | number
  target?: string | number
}

const mockValidationRequests: ValidationRequest[] = [
  {
    id: '1',
    type: 'objective',
    employeeName: 'Jean Kouassi',
    employeeMatricule: 'EMP001',
    employeeService: 'Service Développement',
    title: 'Objectif Q1 2025 - Amélioration processus recrutement',
    description: 'Réduire le délai de recrutement de 30 jours à 20 jours en optimisant le processus de sélection.',
    submittedDate: '2025-01-28',
    status: 'pending',
    priority: 'high',
  },
  {
    id: '2',
    type: 'kpi',
    employeeName: 'Marie Mensah',
    employeeMatricule: 'EMP002',
    employeeService: 'Service Recrutement',
    title: 'KPI Janvier 2025 - Recrutements réalisés',
    description: 'Nombre de recrutements finalisés dans le mois',
    submittedDate: '2025-01-29',
    status: 'pending',
    priority: 'high',
    value: 4,
    target: 2,
  },
  {
    id: '3',
    type: 'absence',
    employeeName: 'Pierre Adjovi',
    employeeMatricule: 'EMP003',
    employeeService: 'Service Comptabilité',
    title: 'Demande de congé - Du 05/02 au 15/02',
    description: 'Congé annuel de 10 jours pour raisons familiales',
    submittedDate: '2025-01-27',
    status: 'pending',
    priority: 'medium',
  },
  {
    id: '4',
    type: 'kpi',
    employeeName: 'Aïcha Diallo',
    employeeMatricule: 'EMP004',
    employeeService: 'Service Ventes',
    title: 'KPI Janvier 2025 - Taux de satisfaction client',
    description: 'Satisfaction client mesurée par enquête mensuelle',
    submittedDate: '2025-01-29',
    status: 'pending',
    priority: 'medium',
    value: '92%',
    target: '85%',
  },
  {
    id: '5',
    type: 'objective',
    employeeName: 'Kofi Mensah',
    employeeMatricule: 'EMP005',
    employeeService: 'Service Crédit',
    title: 'Objectif Q1 2025 - Réduction des dossiers en retard',
    description: 'Traiter 100% des dossiers de crédit dans un délai de 48h',
    submittedDate: '2025-01-26',
    status: 'approved',
    priority: 'medium',
  },
]

export default function ValidationPage() {
  const [requests, setRequests] = useState<ValidationRequest[]>(mockValidationRequests)
  const [selectedTab, setSelectedTab] = useState('all')
  const [filterType, setFilterType] = useState<string>('all')

  const filteredRequests = requests.filter(request => {
    if (selectedTab === 'all') return request.status === 'pending'
    if (selectedTab === 'approved') return request.status === 'approved'
    if (selectedTab === 'rejected') return request.status === 'rejected'
    return true
  }).filter(request => {
    if (filterType === 'all') return true
    return request.type === filterType
  })

  const handleAction = (requestId: string, action: 'approved' | 'rejected' | 'revision') => {
    setRequests(requests.map(req => 
      req.id === requestId ? { ...req, status: action } : req
    ))
  }

  const stats = [
    {
      label: 'En attente',
      value: requests.filter(r => r.status === 'pending').length,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      label: 'Validées',
      value: requests.filter(r => r.status === 'approved').length,
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Rejetées',
      value: requests.filter(r => r.status === 'rejected').length,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
  ]

  const typeIcons = {
    objective: Target,
    kpi: TrendingUp,
    absence: Calendar,
    performance: FileEdit,
  }

  const typeLabels = {
    objective: 'Objectif',
    kpi: 'KPI',
    absence: 'Absence',
    performance: 'Performance',
  }

  const priorityColors = {
    high: 'destructive',
    medium: 'secondary',
    low: 'outline',
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Validation N+1</h1>
          <p className="text-muted-foreground mt-1">
            Gérer les demandes de validation de votre équipe
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 lg:grid-cols-3">
          {stats.map((stat, index) => (
            <Card key={index} className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50/30">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                    <div className="text-3xl font-bold tracking-tight">{stat.value}</div>
                  </div>
                  <div className={`h-14 w-14 rounded-2xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`h-7 w-7 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-gray-50/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Type de demande" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="objective">Objectifs</SelectItem>
                  <SelectItem value="kpi">KPI</SelectItem>
                  <SelectItem value="absence">Absences</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="bg-white shadow-sm border-0">
            <TabsTrigger value="all" className="gap-2">
              <Clock className="h-4 w-4" />
              En attente ({requests.filter(r => r.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Validées
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="h-4 w-4" />
              Rejetées
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-4">
            {filteredRequests.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune demande à afficher</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredRequests.map((request) => {
                  const TypeIcon = typeIcons[request.type]
                  const initials = request.employeeName.split(' ').map(n => n[0]).join('').toUpperCase()

                  return (
                    <Card 
                      key={request.id} 
                      className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50/30"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {/* Employee Avatar */}
                          <Avatar className="h-12 w-12 border-2 border-primary/10">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-sm font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h3 className="font-semibold text-base leading-tight">{request.title}</h3>
                                  <Badge variant={priorityColors[request.priority] as any} className="text-xs">
                                    {request.priority === 'high' ? 'Prioritaire' : request.priority === 'medium' ? 'Moyen' : 'Faible'}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span className="font-medium">{request.employeeName}</span>
                                  <span>•</span>
                                  <span>{request.employeeMatricule}</span>
                                  <span>•</span>
                                  <span>{request.employeeService}</span>
                                </div>
                              </div>
                              <div className={`h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0`}>
                                <TypeIcon className="h-5 w-5 text-primary" />
                              </div>
                            </div>

                            {/* Content */}
                            <div className="bg-white/60 rounded-lg p-4 mb-4">
                              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                                {request.description}
                              </p>
                              {request.value && request.target && (
                                <div className="flex items-center gap-4 pt-3 border-t border-border/50">
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Valeur déclarée</p>
                                    <p className="text-lg font-bold text-primary">{request.value}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Objectif cible</p>
                                    <p className="text-lg font-semibold">{request.target}</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                Soumis le {new Date(request.submittedDate).toLocaleDateString('fr-FR')}
                              </div>

                              {request.status === 'pending' ? (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1.5"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Détails
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                    onClick={() => handleAction(request.id, 'revision')}
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Révision
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleAction(request.id, 'rejected')}
                                  >
                                    <ThumbsDown className="h-3.5 w-3.5" />
                                    Rejeter
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-8 gap-1.5 bg-green-600 hover:bg-green-700"
                                    onClick={() => handleAction(request.id, 'approved')}
                                  >
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                    Valider
                                  </Button>
                                </div>
                              ) : (
                                <Badge 
                                  variant={request.status === 'approved' ? 'default' : 'secondary'}
                                  className={request.status === 'approved' ? 'bg-green-600' : 'bg-red-600'}
                                >
                                  {request.status === 'approved' ? 'Validé' : 'Rejeté'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
