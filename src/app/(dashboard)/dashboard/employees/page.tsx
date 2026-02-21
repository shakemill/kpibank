'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, FileEdit, Trash2, Eye, Mail, Phone, Briefcase, Calendar, MoreVertical, Building2, ChevronDown } from 'lucide-react'

interface Employee {
  id: string
  matricule: string
  name: string
  email: string
  direction: string
  service: string
  department: string
  position: string
  status: 'active' | 'inactive' | 'leave'
  joinDate: string
}

// Structure organisationnelle BGFI
const organizationStructure = {
  'Direction Générale': {
    services: ['Cabinet du DG', 'Secrétariat Général'],
  },
  'Direction des Opérations': {
    services: ['Service Clientèle', 'Service Caisse', 'Service Crédit'],
  },
  'Direction Financière': {
    services: ['Service Comptabilité', 'Service Contrôle de Gestion', 'Service Trésorerie'],
  },
  'Direction des Ressources Humaines': {
    services: ['Service Recrutement', 'Service Formation', 'Service Paie'],
  },
  'Direction Informatique': {
    services: ['Service Développement', 'Service Infrastructure', 'Service Support'],
  },
  'Direction Commerciale': {
    services: ['Service Marketing', 'Service Ventes', 'Service Relation Client'],
  },
  'Direction Juridique': {
    services: ['Service Contentieux', 'Service Conformité'],
  },
}

const mockEmployees: Employee[] = [
  {
    id: '1',
    matricule: 'EMP001',
    name: 'Jean Kouassi',
    email: 'jean.kouassi@bgfi.com',
    direction: 'Direction Informatique',
    service: 'Service Développement',
    department: 'Informatique',
    position: 'Développeur Senior',
    status: 'active',
    joinDate: '2020-03-15',
  },
  {
    id: '2',
    matricule: 'EMP002',
    name: 'Marie Mensah',
    email: 'marie.mensah@bgfi.com',
    direction: 'Direction des Ressources Humaines',
    service: 'Service Recrutement',
    department: 'Ressources Humaines',
    position: 'Responsable RH',
    status: 'active',
    joinDate: '2019-01-10',
  },
  {
    id: '3',
    matricule: 'EMP003',
    name: 'Pierre Adjovi',
    email: 'pierre.adjovi@bgfi.com',
    direction: 'Direction Financière',
    service: 'Service Comptabilité',
    department: 'Finance',
    position: 'Comptable',
    status: 'leave',
    joinDate: '2021-06-20',
  },
  {
    id: '4',
    matricule: 'EMP004',
    name: 'Aïcha Diallo',
    email: 'aicha.diallo@bgfi.com',
    direction: 'Direction Commerciale',
    service: 'Service Ventes',
    department: 'Commercial',
    position: 'Chargée de clientèle',
    status: 'active',
    joinDate: '2022-09-05',
  },
  {
    id: '5',
    matricule: 'EMP005',
    name: 'Kofi Mensah',
    email: 'kofi.mensah@bgfi.com',
    direction: 'Direction des Opérations',
    service: 'Service Crédit',
    department: 'Opérations',
    position: 'Analyste Crédit',
    status: 'active',
    joinDate: '2021-11-08',
  },
  {
    id: '6',
    matricule: 'EMP006',
    name: 'Fatou Traoré',
    email: 'fatou.traore@bgfi.com',
    direction: 'Direction Juridique',
    service: 'Service Conformité',
    department: 'Juridique',
    position: 'Juriste',
    status: 'active',
    joinDate: '2022-02-14',
  },
]

const statusLabels = {
  active: { label: 'Actif', variant: 'default' as const },
  inactive: { label: 'Inactif', variant: 'secondary' as const },
  leave: { label: 'En congé', variant: 'outline' as const },
}

export default function EmployeesPage() {
  const [employees] = useState<Employee[]>(mockEmployees)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDirection, setSelectedDirection] = useState<string>('all')
  const [selectedService, setSelectedService] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const availableServices = selectedDirection !== 'all' && selectedDirection in organizationStructure
    ? organizationStructure[selectedDirection as keyof typeof organizationStructure].services
    : []

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.matricule.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDirection = selectedDirection === 'all' || employee.direction === selectedDirection
    const matchesService = selectedService === 'all' || employee.service === selectedService

    return matchesSearch && matchesDirection && matchesService
  })

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestion des Employés</h1>
            <p className="text-muted-foreground mt-1">
              Gérer les informations des employés de l&apos;entreprise
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un employé
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Ajouter un nouvel employé</DialogTitle>
                <DialogDescription>
                  Remplissez les informations de l&apos;employé
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="matricule">Matricule</Label>
                    <Input id="matricule" placeholder="EMP001" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom complet</Label>
                    <Input id="name" placeholder="Jean Dupont" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="jean.dupont@bgfi.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input id="phone" placeholder="+225 07 00 00 00 00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department">Département</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="it">Informatique</SelectItem>
                        <SelectItem value="hr">Ressources Humaines</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Poste</Label>
                    <Input id="position" placeholder="Développeur" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="joinDate">Date d&apos;embauche</Label>
                    <Input id="joinDate" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salary">Salaire</Label>
                    <Input id="salary" type="number" placeholder="500000" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Annuler
                </Button>
                <Button>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Liste des employés</CardTitle>
            <CardDescription>
              {employees.length} employé(s) enregistré(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, matricule, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                    <SelectItem value="leave">En congé</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <Select value={selectedDirection} onValueChange={(value) => {
                    setSelectedDirection(value)
                    setSelectedService('all')
                  }}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Filtrer par Direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les Directions</SelectItem>
                      {Object.keys(organizationStructure).map((direction) => (
                        <SelectItem key={direction} value={direction}>
                          {direction}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  <Select 
                    value={selectedService} 
                    onValueChange={setSelectedService}
                    disabled={selectedDirection === 'all'}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Filtrer par Service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les Services</SelectItem>
                      {availableServices.map((service) => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(selectedDirection !== 'all' || selectedService !== 'all') && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    {selectedDirection !== 'all' && selectedDirection}
                    {selectedService !== 'all' && ` → ${selectedService}`}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedDirection('all')
                      setSelectedService('all')
                    }}
                    className="h-7 text-xs"
                  >
                    Réinitialiser
                  </Button>
                </div>
              )}
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Aucun employé trouvé</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredEmployees.map((employee) => {
                  const initials = employee.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)

                  return (
                    <Card 
                      key={employee.id} 
                      className="group hover:shadow-xl transition-all duration-300 border-border/50 hover:border-primary/20"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12 border-2 border-primary/10">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-base font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                  {employee.name}
                                </h3>
                                <p className="text-xs text-muted-foreground font-medium">
                                  {employee.matricule}
                                </p>
                              </div>
                              <Badge variant={statusLabels[employee.status].variant} className="flex-shrink-0 text-xs">
                                {statusLabels[employee.status].label}
                              </Badge>
                            </div>

                            <div className="mt-3 space-y-1.5">
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-muted-foreground truncate text-xs">
                                  {employee.email}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Briefcase className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs">
                                  <span className="font-medium">{employee.position}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs text-muted-foreground">
                                  {employee.service}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-muted-foreground text-xs">
                                  Embauché le {new Date(employee.joinDate).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-end">
                              <DropdownMenu key={`menu-${employee.id}`}>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-accent"
                                    aria-label="Actions"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Voir le profil
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                    <FileEdit className="h-4 w-4 mr-2" />
                                    Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={(e) => e.stopPropagation()}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  )
}
