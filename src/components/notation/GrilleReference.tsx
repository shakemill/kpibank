'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useNotationGrille } from '@/contexts/notation-grille-context'
import { getNotationGrille } from '@/lib/notation-grille'
import { cn } from '@/lib/utils'
import { ChevronDown, Scale } from 'lucide-react'

type GrilleReferenceProps = {
  title?: string
  description?: string
  className?: string
  variant?: 'default' | 'officielle'
  collapsible?: boolean
  defaultOpen?: boolean
}

export function GrilleReference({
  title = 'Grille de notation',
  description = 'Référentiel d’appréciation des performances',
  className,
  variant = 'default',
  collapsible = false,
  defaultOpen = true,
}: GrilleReferenceProps) {
  const { referenceRows, config, loading } = useNotationGrille()
  const [open, setOpen] = useState(defaultOpen)
  const [collapsibleMounted, setCollapsibleMounted] = useState(false)

  useEffect(() => {
    setCollapsibleMounted(true)
  }, [])

  const loadingSkeleton = (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>
  )

  const rowsContent =
    variant === 'officielle' ? (
      <>
        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#1e3a5f] hover:bg-[#1e3a5f] border-0">
                <TableHead className="text-white font-semibold w-[22%]">Notation</TableHead>
                <TableHead className="text-white font-semibold w-[20%]">Appréciation</TableHead>
                <TableHead className="text-white font-semibold">Commentaires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referenceRows.map((row) => {
                const cfg = config.find((c) => c.niveau === row.niveau)
                const style = getNotationGrille(cfg?.seuilMin ?? 0, config)
                return (
                  <TableRow key={row.niveau} className="hover:bg-muted/30">
                    <TableCell className="font-semibold tabular-nums">{row.notation}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('font-medium', style.badgeClassName)}>
                        {row.appreciation}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm leading-relaxed">
                      {row.commentaire}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden divide-y">
          {referenceRows.map((row) => {
            const cfg = config.find((c) => c.niveau === row.niveau)
            const style = getNotationGrille(cfg?.seuilMin ?? 0, config)
            return (
              <div key={row.niveau} className="flex gap-3 p-4">
                <div
                  className="w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: style.chartColor }}
                />
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">{row.notation}</span>
                    <Badge variant="outline" className={cn('text-xs', style.badgeClassName)}>
                      {row.appreciation}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{row.commentaire}</p>
                </div>
              </div>
            )
          })}
        </div>
      </>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Notation</TableHead>
            <TableHead>Appréciation</TableHead>
            <TableHead>Commentaires</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {referenceRows.map((row) => (
            <TableRow key={row.niveau}>
              <TableCell className="font-medium">{row.notation}</TableCell>
              <TableCell>{row.appreciation}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{row.commentaire}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )

  const officielleCard = (
    <Card className={cn('overflow-hidden border shadow-sm', className)}>
      <div className="bg-gradient-to-r from-[#c5e0b4] to-[#d8ead0] dark:from-emerald-900/50 dark:to-emerald-800/30 px-5 py-4 border-b">
        <div className="flex items-center justify-center gap-2">
          <Scale className="h-4 w-4 text-[#1e3a5f] dark:text-emerald-200 opacity-80" />
          <h3 className="text-sm font-bold tracking-widest text-[#1e3a5f] dark:text-emerald-100 uppercase">
            {title}
          </h3>
        </div>
        {description && (
          <p className="text-center text-xs text-[#1e3a5f]/80 dark:text-emerald-200/80 mt-2 max-w-lg mx-auto">
            {description}
          </p>
        )}
      </div>
      <CardContent className="p-0">
        {loading ? loadingSkeleton : rowsContent}
      </CardContent>
    </Card>
  )

  const defaultCard = (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">{loading ? loadingSkeleton : rowsContent}</CardContent>
    </Card>
  )

  const inner = variant === 'officielle' ? officielleCard : defaultCard

  if (!collapsible) return inner

  const collapsibleHeader = (
    <div className="flex items-center justify-between gap-2 mb-2">
      <p className="text-sm font-medium text-muted-foreground">Référentiel de notation</p>
      {collapsibleMounted ? (
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
            {open ? 'Masquer' : 'Afficher'}
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
          </Button>
        </CollapsibleTrigger>
      ) : (
        <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs" type="button" tabIndex={-1}>
          {defaultOpen ? 'Masquer' : 'Afficher'}
          <ChevronDown className={cn('h-4 w-4', defaultOpen && 'rotate-180')} />
        </Button>
      )}
    </div>
  )

  if (!collapsibleMounted) {
    return (
      <div>
        {collapsibleHeader}
        {defaultOpen ? inner : null}
      </div>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {collapsibleHeader}
      <CollapsibleContent>{inner}</CollapsibleContent>
    </Collapsible>
  )
}
