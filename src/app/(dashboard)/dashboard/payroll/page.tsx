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
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Download, FileText, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'

interface Payroll {
  id: string
  employeeName: string
  period: string
  baseSalary: number
  bonuses: number
  deductions: number
  netSalary: number
  status: 'paid' | 'pending' | 'processing'
}

const mockPayroll: Payroll[] = [
  {
    id: '1',
    employeeName: 'Jean Kouassi',
    period: 'Janvier 2024',
    baseSalary: 800000,
    bonuses: 150000,
    deductions: 120000,
    netSalary: 830000,
    status: 'paid',
  },
  {
    id: '2',
    employeeName: 'Marie Mensah',
    period: 'Janvier 2024',
    baseSalary: 1200000,
    bonuses: 200000,
    deductions: 180000,
    netSalary: 1220000,
    status: 'paid',
  },
  {
    id: '3',
    employeeName: 'Pierre Adjovi',
    period: 'Janvier 2024',
    baseSalary: 650000,
    bonuses: 80000,
    deductions: 95000,
    netSalary: 635000,
    status: 'paid',
  },
  {
    id: '4',
    employeeName: 'Aïcha Diallo',
    period: 'Janvier 2024',
    baseSalary: 550000,
    bonuses: 60000,
    deductions: 85000,
    netSalary: 525000,
    status: 'pending',
  },
]

const statusLabels = {
  paid: { label: 'Payé', variant: 'default' as const },
  pending: { label: 'En attente', variant: 'outline' as const },
  processing: { label: 'En cours', variant: 'secondary' as const },
}

export default function PayrollPage() {
  const [payroll] = useState<Payroll[]>(mockPayroll)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPayroll = payroll.filter((item) =>
    item.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalBaseSalary = payroll.reduce((sum, item) => sum + item.baseSalary, 0)
  const totalBonuses = payroll.reduce((sum, item) => sum + item.bonuses, 0)
  const totalDeductions = payroll.reduce((sum, item) => sum + item.deductions, 0)
  const totalNetSalary = payroll.reduce((sum, item) => sum + item.netSalary, 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestion de la Paie</h1>
            <p className="text-muted-foreground mt-1">
              Gérer les salaires et les paiements
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Générer la paie
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Salaire de base
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalBaseSalary)}</div>
              <p className="text-xs text-muted-foreground mt-1">Total du mois</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Primes
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{formatCurrency(totalBonuses)}</div>
              <p className="text-xs text-muted-foreground mt-1">+8% ce mois</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Déductions
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{formatCurrency(totalDeductions)}</div>
              <p className="text-xs text-muted-foreground mt-1">Taxes et cotisations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net à payer
                </CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{formatCurrency(totalNetSalary)}</div>
              <p className="text-xs text-muted-foreground mt-1">Montant total</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Détails de la paie</CardTitle>
            <CardDescription>Vue détaillée des salaires par employé</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un employé..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select defaultValue="janvier-2024">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="janvier-2024">Janvier 2024</SelectItem>
                  <SelectItem value="decembre-2023">Décembre 2023</SelectItem>
                  <SelectItem value="novembre-2023">Novembre 2023</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead className="text-right">Salaire de base</TableHead>
                    <TableHead className="text-right">Primes</TableHead>
                    <TableHead className="text-right">Déductions</TableHead>
                    <TableHead className="text-right">Net à payer</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayroll.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Aucun enregistrement trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayroll.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.employeeName}</TableCell>
                        <TableCell>{item.period}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.baseSalary)}</TableCell>
                        <TableCell className="text-right text-green-500">
                          +{formatCurrency(item.bonuses)}
                        </TableCell>
                        <TableCell className="text-right text-orange-500">
                          -{formatCurrency(item.deductions)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.netSalary)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusLabels[item.status].variant}>
                            {statusLabels[item.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Fiche
                          </Button>
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
