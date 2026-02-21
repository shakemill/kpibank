'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  Download,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  FileText,
  PieChart,
} from 'lucide-react'

export default function ReportsPage() {
  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rapports & Statistiques</h1>
            <p className="text-muted-foreground mt-1">
              Analyser les données RH et générer des rapports
            </p>
          </div>
          <div className="flex gap-2">
            <Select defaultValue="janvier-2024">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="janvier-2024">Janvier 2024</SelectItem>
                <SelectItem value="decembre-2023">Décembre 2023</SelectItem>
                <SelectItem value="q4-2023">Q4 2023</SelectItem>
                <SelectItem value="annee-2023">Année 2023</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
            <TabsTrigger value="employees">Employés</TabsTrigger>
            <TabsTrigger value="absences">Absences</TabsTrigger>
            <TabsTrigger value="payroll">Paie</TabsTrigger>
            <TabsTrigger value="training">Formations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Employés
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">248</div>
                  <p className="text-xs text-green-500 mt-1">+12 ce mois</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Taux de présence
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">94.3%</div>
                  <p className="text-xs text-muted-foreground mt-1">+2.1% vs mois dernier</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Budget Paie
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2.4M XAF</div>
                  <p className="text-xs text-muted-foreground mt-1">Janvier 2024</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Formations actives
                    </CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8</div>
                  <p className="text-xs text-muted-foreground mt-1">42 participants</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Évolution des effectifs</CardTitle>
                  <CardDescription>Sur les 12 derniers mois</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center border border-dashed rounded-lg">
                    <div className="text-center text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                      <p>Graphique d&apos;évolution des effectifs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Répartition par département</CardTitle>
                  <CardDescription>Distribution actuelle</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center border border-dashed rounded-lg">
                    <div className="text-center text-muted-foreground">
                      <PieChart className="h-12 w-12 mx-auto mb-2" />
                      <p>Graphique de répartition</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employees" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Rapports Employés</CardTitle>
                  <CardDescription>
                    Générez des rapports détaillés sur les employés
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Button variant="outline" className="h-24 flex-col gap-2">
                      <FileText className="h-6 w-6" />
                      <div>
                        <p className="font-medium">Liste complète des employés</p>
                        <p className="text-xs text-muted-foreground">
                          Tous les détails et informations
                        </p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-24 flex-col gap-2">
                      <BarChart3 className="h-6 w-6" />
                      <div>
                        <p className="font-medium">Répartition par département</p>
                        <p className="text-xs text-muted-foreground">Analyse par service</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-24 flex-col gap-2">
                      <TrendingUp className="h-6 w-6" />
                      <div>
                        <p className="font-medium">Turnover et recrutement</p>
                        <p className="text-xs text-muted-foreground">Entrées et sorties</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-24 flex-col gap-2">
                      <Users className="h-6 w-6" />
                      <div>
                        <p className="font-medium">Ancienneté moyenne</p>
                        <p className="text-xs text-muted-foreground">Par département</p>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="absences" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Rapports Absences</CardTitle>
                  <CardDescription>Analyse des congés et absences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Button variant="outline" className="h-24 flex-col gap-2">
                      <Calendar className="h-6 w-6" />
                      <div>
                        <p className="font-medium">Congés par période</p>
                        <p className="text-xs text-muted-foreground">Vue mensuelle/annuelle</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-24 flex-col gap-2">
                      <BarChart3 className="h-6 w-6" />
                      <div>
                        <p className="font-medium">Taux d&apos;absentéisme</p>
                        <p className="text-xs text-muted-foreground">Évolution dans le temps</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-24 flex-col gap-2">
                      <PieChart className="h-6 w-6" />
                      <div>
                        <p className="font-medium">Types d&apos;absence</p>
                        <p className="text-xs text-muted-foreground">Répartition par type</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-24 flex-col gap-2">
                      <FileText className="h-6 w-6" />
                      <div>
                        <p className="font-medium">Solde de congés</p>
                        <p className="text-xs text-muted-foreground">Par employé</p>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payroll" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Rapports Paie</CardTitle>
                  <CardDescription>Analyse des coûts salariaux</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Button variant="outline" className="h-24 flex-col gap-2">
                      <DollarSign className="h-6 w-6" />
                      <div>
                        <p className="font-medium">Masse salariale</p>
                        <p className="text-xs text-muted-foreground">Évolution mensuelle</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-24 flex-col gap-2">
                      <BarChart3 className="h-6 w-6" />
                      <div>
                        <p className="font-medium">Répartition des coûts</p>
                        <p className="text-xs text-muted-foreground">Par département</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-24 flex-col gap-2">
                      <TrendingUp className="h-6 w-6" />
                      <div>
                        <p className="font-medium">Primes et bonus</p>
                        <p className="text-xs text-muted-foreground">Distribution</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-24 flex-col gap-2">
                      <FileText className="h-6 w-6" />
                      <div>
                        <p className="font-medium">Charges sociales</p>
                        <p className="text-xs text-muted-foreground">Détail des cotisations</p>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="training" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Rapports Formations</CardTitle>
                  <CardDescription>Suivi des programmes de formation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Button variant="outline" className="h-24 flex-col gap-2">
                      <Calendar className="h-6 w-6" />
                      <div>
                        <p className="font-medium">Calendrier des formations</p>
                        <p className="text-xs text-muted-foreground">Planification annuelle</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-24 flex-col gap-2">
                      <Users className="h-6 w-6" />
                      <div>
                        <p className="font-medium">Taux de participation</p>
                        <p className="text-xs text-muted-foreground">Par formation</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-24 flex-col gap-2">
                      <BarChart3 className="h-6 w-6" />
                      <div>
                        <p className="font-medium">Budget formation</p>
                        <p className="text-xs text-muted-foreground">Utilisation et prévisions</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-24 flex-col gap-2">
                      <TrendingUp className="h-6 w-6" />
                      <div>
                        <p className="font-medium">Compétences développées</p>
                        <p className="text-xs text-muted-foreground">Impact des formations</p>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
