'use client'

import { useState } from 'react'
import { useEtablissement } from '@/contexts/etablissement-context'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  ChevronRight,
  Users,
  ArrowLeft
} from 'lucide-react'

interface Service {
  id: string
  name: string
  employeeCount: number
}

interface Direction {
  id: string
  name: string
  services: Service[]
  totalEmployees: number
}

export default function DepartmentsServicesPage() {
  const router = useRouter()
  const { nom: nomEtablissement } = useEtablissement()
  const [isAddDirectionOpen, setIsAddDirectionOpen] = useState(false)
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false)
  const [selectedDirection, setSelectedDirection] = useState<string | null>(null)
  const [newDirectionName, setNewDirectionName] = useState('')
  const [newServiceName, setNewServiceName] = useState('')

  // Structure organisationnelle initiale
  const [directions, setDirections] = useState<Direction[]>([
    {
      id: '1',
      name: 'Direction Générale',
      totalEmployees: 12,
      services: [
        { id: '1-1', name: 'Cabinet du DG', employeeCount: 5 },
        { id: '1-2', name: 'Secrétariat Général', employeeCount: 7 },
      ],
    },
    {
      id: '2',
      name: 'Direction des Opérations',
      totalEmployees: 45,
      services: [
        { id: '2-1', name: 'Service Clientèle', employeeCount: 18 },
        { id: '2-2', name: 'Service Caisse', employeeCount: 15 },
        { id: '2-3', name: 'Service Crédit', employeeCount: 12 },
      ],
    },
    {
      id: '3',
      name: 'Direction Financière',
      totalEmployees: 28,
      services: [
        { id: '3-1', name: 'Service Comptabilité', employeeCount: 12 },
        { id: '3-2', name: 'Service Contrôle de Gestion', employeeCount: 8 },
        { id: '3-3', name: 'Service Trésorerie', employeeCount: 8 },
      ],
    },
    {
      id: '4',
      name: 'Direction des Ressources Humaines',
      totalEmployees: 15,
      services: [
        { id: '4-1', name: 'Service Recrutement', employeeCount: 5 },
        { id: '4-2', name: 'Service Formation', employeeCount: 4 },
        { id: '4-3', name: 'Service Paie', employeeCount: 6 },
      ],
    },
    {
      id: '5',
      name: 'Direction Informatique',
      totalEmployees: 22,
      services: [
        { id: '5-1', name: 'Service Développement', employeeCount: 10 },
        { id: '5-2', name: 'Service Infrastructure', employeeCount: 7 },
        { id: '5-3', name: 'Service Support', employeeCount: 5 },
      ],
    },
    {
      id: '6',
      name: 'Direction Commerciale',
      totalEmployees: 38,
      services: [
        { id: '6-1', name: 'Service Marketing', employeeCount: 12 },
        { id: '6-2', name: 'Service Ventes', employeeCount: 20 },
        { id: '6-3', name: 'Service Relation Client', employeeCount: 6 },
      ],
    },
    {
      id: '7',
      name: 'Direction Juridique',
      totalEmployees: 10,
      services: [
        { id: '7-1', name: 'Service Contentieux', employeeCount: 5 },
        { id: '7-2', name: 'Service Conformité', employeeCount: 5 },
      ],
    },
  ])

  const handleAddDirection = () => {
    if (newDirectionName.trim()) {
      const newDirection: Direction = {
        id: `${Date.now()}`,
        name: newDirectionName,
        services: [],
        totalEmployees: 0,
      }
      setDirections([...directions, newDirection])
      setNewDirectionName('')
      setIsAddDirectionOpen(false)
    }
  }

  const handleAddService = () => {
    if (newServiceName.trim() && selectedDirection) {
      setDirections(directions.map(dir => {
        if (dir.id === selectedDirection) {
          return {
            ...dir,
            services: [
              ...dir.services,
              {
                id: `${dir.id}-${Date.now()}`,
                name: newServiceName,
                employeeCount: 0,
              },
            ],
          }
        }
        return dir
      }))
      setNewServiceName('')
      setIsAddServiceOpen(false)
      setSelectedDirection(null)
    }
  }

  const handleDeleteDirection = (directionId: string) => {
    setDirections(directions.filter(dir => dir.id !== directionId))
  }

  const handleDeleteService = (directionId: string, serviceId: string) => {
    setDirections(directions.map(dir => {
      if (dir.id === directionId) {
        return {
          ...dir,
          services: dir.services.filter(service => service.id !== serviceId),
        }
      }
      return dir
    }))
  }

  const totalEmployees = directions.reduce((sum, dir) => sum + dir.totalEmployees, 0)

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/admin')}
              className="hover:bg-accent"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Départements & Services</h1>
              <p className="text-muted-foreground mt-1">
                Gérer la structure organisationnelle de {nomEtablissement}
              </p>
            </div>
          </div>
          <Dialog open={isAddDirectionOpen} onOpenChange={setIsAddDirectionOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nouvelle Direction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une nouvelle Direction</DialogTitle>
                <DialogDescription>
                  Créer une nouvelle direction dans l&apos;organigramme de {nomEtablissement}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="direction-name">Nom de la Direction</Label>
                  <Input
                    id="direction-name"
                    placeholder="Ex: Direction des Risques"
                    value={newDirectionName}
                    onChange={(e) => setNewDirectionName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDirectionOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleAddDirection}>
                  Ajouter
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-gray-50/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Directions</p>
                  <div className="text-3xl font-bold">{directions.length}</div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-gray-50/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Services</p>
                  <div className="text-3xl font-bold">
                    {directions.reduce((sum, dir) => sum + dir.services.length, 0)}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-green-50 flex items-center justify-center">
                  <ChevronRight className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-gray-50/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Employés</p>
                  <div className="text-3xl font-bold">{totalEmployees}</div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Directions List */}
        <div className="space-y-4">
          {directions.map((direction) => (
            <Card 
              key={direction.id}
              className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50/30"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{direction.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {direction.totalEmployees} employés
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {direction.services.length} services
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        {direction.services.length === 0 
                          ? 'Aucun service configuré' 
                          : `${direction.services.length} service${direction.services.length > 1 ? 's' : ''} rattaché${direction.services.length > 1 ? 's' : ''}`}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog open={isAddServiceOpen && selectedDirection === direction.id} onOpenChange={(open) => {
                      setIsAddServiceOpen(open)
                      if (!open) setSelectedDirection(null)
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-xs"
                          onClick={() => setSelectedDirection(direction.id)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Service
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ajouter un Service</DialogTitle>
                          <DialogDescription>
                            Créer un nouveau service dans {direction.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="service-name">Nom du Service</Label>
                            <Input
                              id="service-name"
                              placeholder="Ex: Service Audit Interne"
                              value={newServiceName}
                              onChange={(e) => setNewServiceName(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => {
                            setIsAddServiceOpen(false)
                            setSelectedDirection(null)
                          }}>
                            Annuler
                          </Button>
                          <Button onClick={handleAddService}>
                            Ajouter
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteDirection(direction.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              {direction.services.length > 0 && (
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {direction.services.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white shadow-sm hover:shadow-md transition-all border border-border/50"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <ChevronRight className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{service.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {service.employeeCount} employé{service.employeeCount > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteService(direction.id, service.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
