"use client"

import { useState } from "react"
import { Check, CalendarCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { DateOption } from "@/lib/types"

interface DatePollProps {
  options: DateOption[]
  userName: string
  onToggleVote: (optionId: string) => void
  onFinalize: (date: string) => void
}

function formatOptionDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

/**
 * Availability poll shown on a meeting card that has candidate dates instead
 * of a locked-in date. Tap a date row to mark yourself available (toggles
 * instantly — no submit step). The winning date is called out in a quiet
 * status row with a small "Lock it in" trigger, deliberately understated so
 * it never reads as a required submit button. See DESIGN.md → "Date poll".
 */
export function DatePoll({ options, userName, onToggleVote, onFinalize }: DatePollProps) {
  const [confirmDate, setConfirmDate] = useState<string | null>(null)

  const maxVotes = Math.max(...options.map((o) => o.voters.length), 0)
  const leadingIds = options.filter((o) => maxVotes > 0 && o.voters.length === maxVotes).map((o) => o.id)
  const leader = leadingIds.length === 1 ? options.find((o) => o.id === leadingIds[0]) : undefined

  return (
    <div className="space-y-2">
      <AlertDialog open={!!confirmDate} onOpenChange={(open) => !open && setConfirmDate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Lock in {confirmDate ? formatOptionDate(confirmDate) : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This closes the poll and sets the meeting date. Everyone can then RSVP as usual.
              You can reopen the poll later if the date stops working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDate && onFinalize(confirmDate)}>
              Lock it in
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="text-sm font-medium text-foreground">
        Which dates work for you? Tap all that do.
      </p>

      <div className="space-y-2">
        {options.map((option) => {
          const available = option.voters.includes(userName)
          const isLeading = leadingIds.includes(option.id) && maxVotes > 0
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggleVote(option.id)}
              aria-pressed={available}
              className={`w-full rounded-lg border px-3 py-3.5 flex items-center gap-3 text-left transition-colors ${
                available
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted"
              } ${isLeading ? "ring-2 ring-primary/20" : ""}`}
            >
              <span
                className={`h-7 w-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  available ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                }`}
              >
                {available && <Check className="h-4.5 w-4.5" strokeWidth={2.5} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-base font-medium text-foreground">
                  {formatOptionDate(option.date)}
                </span>
                {option.voters.length > 0 && (
                  <span className="block text-xs text-muted-foreground truncate">
                    {option.voters.join(", ")}
                  </span>
                )}
              </span>
              <span className="text-base font-semibold text-primary tabular-nums">
                {option.voters.length > 0 && option.voters.length}
              </span>
            </button>
          )
        })}
      </div>

      {leader && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-sm text-muted-foreground min-w-0 truncate">
            <span className="font-medium text-foreground">{formatOptionDate(leader.date)}</span>
            {" "}is winning
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-11 gap-1.5 flex-shrink-0 text-primary hover:text-primary hover:bg-primary/10"
            onClick={() => setConfirmDate(leader.date)}
          >
            <CalendarCheck className="h-4 w-4" strokeWidth={1.5} />
            Lock it in
          </Button>
        </div>
      )}
    </div>
  )
}
