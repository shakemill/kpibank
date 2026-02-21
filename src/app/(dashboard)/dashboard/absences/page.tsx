'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Plus, Search, Calendar, Check, X } from 'lucide-react'

interface Absence {
  id: string
  employeeName: string
  type: 'conge' | 'maladie' | 'autre'
  startDate: string
  endDate: string
  days: number
  status: 'pending' | 'approved' | 'rejected'
  reason: string
  submittedDate: string
}

const mockAbsences: Absence[] = [
  {
    id: '1',
    employeeName: 'Jean Kouassi',
    type: 'conge',
    startDate: '2024-02-15',
    endDate: '2024-02-22',
    days: 7,
    status: 'pending',
    reason: 'Congés annuels',
    submittedDate: '2024-02-01',
  },
  {
    id: '2',
    employeeName: 'Marie Mensah',
    type: 'maladie',
    startDate: '2024-02-10',
    endDate: '2024-02-12',
    days: 3,
    status: 'approved',
    reason: 'Grippe',
    submittedDate: '2024-02-09',
  },
  {
    id: '3',
    employeeName: 'Pierre Adjovi',
    type: 'conge',
    startDate: '2024-03-01',
    endDate: '2024-03-15',
    days: 14,
    status: 'approved',
    reason: 'Voyage familial',
    submittedDate: '2024-01-15',
  },
  {
    id: '4',
    employeeName: 'Aïcha Diallo',
    type: 'autre',
    startDate: '2024-02-18',
    endDate: '2024-02-18',
    days: 1,
    status: 'rejected',
    reason: 'Rendez-vous personnel',
    submittedDate: '2024-02-16',
  },
]

const typeLabels = {
  conge: { label: 'Congé', color: 'bg-blue-500/10 text-blue-500' },
  maladie: { label: 'Maladie', color: 'bg-orange-500/10 text-orange-500' },
  autre: { label: 'Autre', color: 'bg-gray-500/10 text-gray-400' },
}

const statusLabels = {
  pending: { label: 'En attente', variant: 'outline' as const },
  approved: { label: 'Approuvé', variant: 'default' as const },
  rejected: { label: 'Rejeté', variant: 'destructive' as const },
}

export default function AbsencesPage() {
  const [absences] = useState<Absence[]>(mockAbsences)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const filteredAbsences = absences.filter((absence) =>
    absence.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: absences.length,
    pending: absences.filter((a) => a.status === 'pending').length,
    approved: absences.filter((a) => a.status === 'approved').length,
    rejected: absences.filter((a) => a.status === 'rejected').length,
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestion des Absences</h1>
            <p className="text-muted-foreground mt-1">
              Gérer les demandes de congés et absences
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle demande
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nouvelle demande d&apos;absence</DialogTitle>
                <DialogDescription>
                  Remplissez les détails de la demande d&apos;absence
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="employee">Employé</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un employé" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Jean Kouassi</SelectItem>
                      <SelectItem value="2">Marie Mensah</SelectItem>
                      <SelectItem value="3">Pierre Adjovi</SelectItem>
                      <SelectItem value="4">Aïcha Diallo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type d&apos;absence</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conge">Congé</SelectItem>
                      <SelectItem value="maladie">Maladie</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="reason">Motif</Label>
                  <Textarea
                    id="reason"
                    placeholder="Décrivez la raison de l'absence..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Annuler
                </Button>
                <Button>Soumettre</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                En attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approuvées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rejetées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Demandes d&apos;absence</CardTitle>
            <CardDescription>Gérer et approuver les demandes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom d'employé..."
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
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="approved">Approuvé</SelectItem>
                  <SelectItem value="rejected">Rejeté</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Motif</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAbsences.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucune demande trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAbsences.map((absence) => (
                      <TableRow key={absence.id}>
                        <TableCell className="font-medium">{absence.employeeName}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              typeLabels[absence.type].color
                            }`}
                          >
                            {typeLabels[absence.type].label}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(absence.startDate).toLocaleDateString('fr-FR')} -{' '}
                          {new Date(absence.endDate).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell>{absence.days} jour(s)</TableCell>
                        <TableCell className="max-w-[200px] truncate">{absence.reason}</TableCell>
                        <TableCell>
                          <Badge variant={statusLabels[absence.status].variant}>
                            {statusLabels[absence.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {absence.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" className="text-green-500">
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
