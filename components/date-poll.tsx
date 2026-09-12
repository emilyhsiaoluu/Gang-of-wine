"use client"

import { useState } from "react"
import { Check, CalendarCheck, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

/** Ten-plus people need more than a couple of candidate nights, but a poll
 *  long enough to scroll stops getting answered. Six is the compromise. */
export const MAX_DATE_OPTIONS = 6

interface DatePollProps {
  options: DateOption[]
  userName: string
  onToggleVote: (optionId: string) => void
  onFinalize: (date: string) => void
  onAddOption?: (date: string) => void
  onRemoveOption?: (optionId: string) => void
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
 *
 * Anyone can add a date to a poll that is already open — the first dates
 * offered often suit nobody, and restarting the poll would throw away
 * everyone's availability. A date nobody has picked yet can be removed by
 * anyone (it undoes a mis-tap); once someone votes for it the remove control
 * disappears, because deleting it would delete their answer.
 */
export function DatePoll({
  options,
  userName,
  onToggleVote,
  onFinalize,
  onAddOption,
  onRemoveOption,
}: DatePollProps) {
  const [confirmDate, setConfirmDate] = useState<string | null>(null)
  const [addingDate, setAddingDate] = useState(false)
  const [newDate, setNewDate] = useState("")

  const maxVotes = Math.max(...options.map((o) => o.voters.length), 0)
  const leadingIds = options.filter((o) => maxVotes > 0 && o.voters.length === maxVotes).map((o) => o.id)
  const leader = leadingIds.length === 1 ? options.find((o) => o.id === leadingIds[0]) : undefined

  const isDuplicate = newDate !== "" && options.some((o) => o.date === newDate)
  const canAddMore = !!onAddOption && options.length < MAX_DATE_OPTIONS

  const cancelAdd = () => {
    setAddingDate(false)
    setNewDate("")
  }

  const submitAdd = () => {
    if (!newDate || isDuplicate) return
    onAddOption?.(newDate)
    cancelAdd()
  }

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
          const removable = option.voters.length === 0 && !!onRemoveOption
          return (
            <div
              key={option.id}
              // Hover lives on the row, not the inner button: with a remove
              // control alongside it, highlighting only the button fills part
              // of the row and leaves a visible seam.
              className={`w-full rounded-lg border flex items-center transition-colors ${
                available ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
              } ${isLeading ? "ring-2 ring-primary/20" : ""}`}
            >
              <button
                type="button"
                onClick={() => onToggleVote(option.id)}
                aria-pressed={available}
                className="flex-1 min-w-0 flex items-center gap-3 px-3 py-3.5 text-left"
              >
                <span
                  className={`h-7 w-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    available ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                  }`}
                >
                  {/* Reversed-out tick on a filled circle: stays bold on purpose,
                      a thin check loses legibility at this size */}
                  {available && <Check className="h-4.5 w-4.5" style={{ "--icon-stroke": 3 } as React.CSSProperties} />}
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
              {removable && (
                <button
                  type="button"
                  onClick={() => onRemoveOption?.(option.id)}
                  aria-label={`Remove ${formatOptionDate(option.date)}`}
                  className="h-11 w-11 flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {canAddMore &&
        (addingDate ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                autoFocus
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                aria-label="New date to add to the poll"
                className="h-11 flex-1"
              />
              <Button
                type="button"
                onClick={submitAdd}
                disabled={!newDate || isDuplicate}
                className="h-11 min-w-[44px]"
              >
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={cancelAdd}
                aria-label="Cancel adding a date"
                className="h-11 w-11 p-0 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {isDuplicate && (
              <p className="text-xs text-muted-foreground">That date is already on the poll.</p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingDate(true)}
            className="w-full h-12 rounded-lg border border-dashed border-border flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add a date
          </button>
        ))}

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
            <CalendarCheck className="h-4 w-4" />
            Lock it in
          </Button>
        </div>
      )}
    </div>
  )
}
