'use client'

import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useNotationGrille } from '@/contexts/notation-grille-context'
import { cn } from '@/lib/utils'

type NotationBadgeProps = {
  taux: number
  showCommentaire?: boolean
  showTaux?: boolean
  variant?: 'badge' | 'text'
  className?: string
}

export function NotationBadge({
  taux,
  showCommentaire = false,
  showTaux = false,
  variant = 'badge',
  className,
}: NotationBadgeProps) {
  const { getNotation } = useNotationGrille()
  const notation = getNotation(taux)

  if (variant === 'text') {
    return (
      <span className={cn(notation.textClassName, className)}>
        {showTaux ? `${taux.toFixed(1)} % — ` : ''}
        {notation.appreciation}
      </span>
    )
  }

  const badge = (
    <Badge variant="outline" className={cn(notation.badgeClassName, className)}>
      {showTaux ? `${taux.toFixed(1)} % · ` : ''}
      {notation.appreciation}
    </Badge>
  )

  if (!showCommentaire) return badge

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">{notation.commentaire}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
