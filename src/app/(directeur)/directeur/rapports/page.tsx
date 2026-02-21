'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

export default function DirecteurRapportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rapports</h1>
        <p className="text-muted-foreground">
          Synthèse et rapports de la direction.
        </p>
      </div>
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Rapports direction
          </CardTitle>
          <CardDescription>
            Les rapports détaillés (export PDF, tableaux de bord) seront disponibles ici.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Consultez la page &quot;Mes KPI direction&quot; pour le détail des objectifs et la page
            &quot;Services&quot; pour les indicateurs par service.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
