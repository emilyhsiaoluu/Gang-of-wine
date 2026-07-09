"use client"

import type { LucideIcon } from "lucide-react"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface CardAction {
  icon: LucideIcon
  label: string
  onClick: () => void
  /** Filled/highlighted state, e.g. "you voted" */
  active?: boolean
  /** Small count or status text rendered next to the icon */
  count?: number | string
}

export interface CardMenuItem {
  label: string
  onClick: () => void
  destructive?: boolean
}

interface CardActionBarProps {
  actions: CardAction[]
  menuItems?: CardMenuItem[]
  /** Social-proof line under the icons, e.g. "Voted by Emily, Sarah" */
  caption?: React.ReactNode
}

/**
 * Instagram-style action row for cards: a tidy strip of icon buttons on the
 * left, an overflow "…" menu on the right for rare/destructive actions, and
 * an optional caption line underneath. See DESIGN.md → "Card action bar".
 */
export function CardActionBar({ actions, menuItems, caption }: CardActionBarProps) {
  return (
    <div className="border-t border-border pt-1 mt-3 -mx-4 px-2">
      <div className="flex items-center">
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
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className={`h-5 w-5 ${active ? "fill-current" : ""}`} />
            {count != null && count !== 0 && (
              <span className="text-sm font-medium tabular-nums">{count}</span>
            )}
            <span className="sr-only sm:not-sr-only sm:text-xs sm:font-medium">{label}</span>
          </Button>
        ))}

        {menuItems && menuItems.length > 0 && (
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="More options"
                  className="h-11 w-11 rounded-full text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {menuItems.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
                    onClick={item.onClick}
                    className={item.destructive ? "text-destructive focus:text-destructive" : ""}
                  >
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      {caption && <p className="px-3 pb-2 text-xs text-muted-foreground">{caption}</p>}
    </div>
  )
}
