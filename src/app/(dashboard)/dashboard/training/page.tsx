'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Plus, Search, Users, Calendar, Clock, GraduationCap } from 'lucide-react'

interface Training {
  id: string
  title: string
  description: string
  instructor: string
  startDate: string
  endDate: string
  duration: string
  participants: number
  maxParticipants: number
  status: 'upcoming' | 'ongoing' | 'completed'
  category: string
}

const mockTrainings: Training[] = [
  {
    id: '1',
    title: 'Sécurité Informatique',
    description: 'Formation sur les bonnes pratiques de sécurité IT',
    instructor: 'Dr. Koné',
    startDate: '2024-03-01',
    endDate: '2024-03-05',
    duration: '5 jours',
    participants: 15,
    maxParticipants: 20,
    status: 'upcoming',
    category: 'IT',
  },
  {
    id: '2',
    title: 'Leadership et Management',
    description: 'Développer vos compétences en leadership',
    instructor: 'Marie Laurent',
    startDate: '2024-02-15',
    endDate: '2024-02-20',
    duration: '5 jours',
    participants: 12,
    maxParticipants: 15,
    status: 'ongoing',
    category: 'Management',
  },
  {
    id: '3',
    title: 'Excel Avancé',
    description: 'Maîtriser les fonctionnalités avancées d\'Excel',
    instructor: 'Jean Dupont',
    startDate: '2024-01-10',
    endDate: '2024-01-12',
    duration: '3 jours',
    participants: 20,
    maxParticipants: 20,
    status: 'completed',
    category: 'Bureautique',
  },
  {
    id: '4',
    title: 'Communication Efficace',
    description: 'Améliorer vos compétences en communication',
    instructor: 'Sophie Martin',
    startDate: '2024-03-15',
    endDate: '2024-03-17',
    duration: '3 jours',
    participants: 8,
    maxParticipants: 25,
    status: 'upcoming',
    category: 'Soft Skills',
  },
]

const statusLabels = {
  upcoming: { label: 'À venir', variant: 'outline' as const, color: 'text-blue-500' },
  ongoing: { label: 'En cours', variant: 'default' as const, color: 'text-green-500' },
  completed: { label: 'Terminé', variant: 'secondary' as const, color: 'text-gray-400' },
}

export default function TrainingPage() {
  const [trainings] = useState<Training[]>(mockTrainings)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const filteredTrainings = trainings.filter(
    (training) =>
      training.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      training.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: trainings.length,
    upcoming: trainings.filter((t) => t.status === 'upcoming').length,
    ongoing: trainings.filter((t) => t.status === 'ongoing').length,
    completed: trainings.filter((t) => t.status === 'completed').length,
    totalParticipants: trainings.reduce((sum, t) => sum + t.participants, 0),
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestion des Formations</h1>
            <p className="text-muted-foreground mt-1">
              Planifier et suivre les programmes de formation
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle formation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Planifier une nouvelle formation</DialogTitle>
                <DialogDescription>
                  Remplissez les détails de la formation
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre de la formation</Label>
                  <Input id="title" placeholder="Ex: Sécurité Informatique" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez les objectifs de la formation..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instructor">Formateur</Label>
                    <Input id="instructor" placeholder="Nom du formateur" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="it">IT</SelectItem>
                        <SelectItem value="management">Management</SelectItem>
                        <SelectItem value="bureautique">Bureautique</SelectItem>
                        <SelectItem value="soft-skills">Soft Skills</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Date de début</Label>
                    <Input id="startDate" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Date de fin</Label>
                    <Input id="endDate" type="date" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">Nombre max de participants</Label>
                  <Input id="maxParticipants" type="number" placeholder="20" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Annuler
                </Button>
                <Button>Créer la formation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total
                </CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                À venir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats.upcoming}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                En cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.ongoing}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Terminées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-400">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Participants
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalParticipants}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une formation..."
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
              <SelectItem value="upcoming">À venir</SelectItem>
              <SelectItem value="ongoing">En cours</SelectItem>
              <SelectItem value="completed">Terminé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredTrainings.map((training) => (
            <Card key={training.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{training.title}</CardTitle>
                    <CardDescription className="mt-2">{training.description}</CardDescription>
                  </div>
                  <Badge variant={statusLabels[training.status].variant}>
                    {statusLabels[training.status].label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Formateur: {training.instructor}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{training.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(training.startDate).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Badge variant="outline">{training.category}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Participants</span>
                    <span className="font-medium">
                      {training.participants}/{training.maxParticipants}
                    </span>
                  </div>
                  <Progress
                    value={(training.participants / training.maxParticipants) * 100}
                    className="h-2"
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Voir détails
                  </Button>
                  <Button size="sm" className="flex-1">
                    Inscrire des participants
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
