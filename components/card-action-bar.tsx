"use client"

import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface CardAction {
  icon: LucideIcon
  label: string
  onClick: () => void
  /** Filled/highlighted state, e.g. "you voted" */
  active?: boolean
  /** Small count or status text rendered next to the icon */
  count?: number | string
}

interface CardActionBarProps {
  actions: CardAction[]
  /** Social-proof line under the icons, e.g. "Voted by Emily, Sarah" */
  caption?: React.ReactNode
}

/**
 * Instagram-style action row for cards: a row of large icon buttons with an
 * optional caption line underneath. Separation from the content above comes
 * from whitespace, not a divider. See DESIGN.md → "Card action bar".
 */
export function CardActionBar({ actions, caption }: CardActionBarProps) {
  return (
    <div className="mt-3 -ml-3">
      <div className="flex items-center gap-1">
        {actions.map(({ icon: Icon, label, onClick, active, count }) => (
          <Button
            key={label}
            variant="ghost"
            size="sm"
            onClick={onClick}
            aria-label={label}
            aria-pressed={active}
            className={`h-11 px-3 gap-1.5 rounded-full ${
              active
                ? "text-primary hover:text-primary hover:bg-primary/10"
                : "text-foreground hover:text-foreground"
            }`}
          >
            <Icon className={`!h-6 !w-6 ${active ? "fill-current" : ""}`} strokeWidth={1.5} />
            {count != null && count !== 0 && (
              <span className="text-base font-medium tabular-nums">{count}</span>
            )}
            <span className="text-sm font-medium">{label}</span>
          </Button>
        ))}
      </div>
      {caption && <p className="px-3 text-sm text-muted-foreground">{caption}</p>}
    </div>
  )
}
