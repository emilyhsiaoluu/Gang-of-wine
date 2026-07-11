"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Clock } from "lucide-react"

interface TimePickerProps {
  value: string // "HH:MM" 24-hr, or "TBD", or ""
  onChange: (value: string) => void // "HH:MM" 24-hr or "TBD"
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)   // 1–12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)  // 0,5,10,...55

const ITEM_H = 44 // px height of each scroll item

function parseValue(value: string): { hour: number; minute: number; ampm: "AM" | "PM" } {
  if (!value || value === "TBD") return { hour: 7, minute: 0, ampm: "PM" }
  const [h, m] = value.split(":").map(Number)
  const ampm: "AM" | "PM" = h >= 12 ? "PM" : "AM"
  const hour = h % 12 === 0 ? 12 : h % 12
  const minute = Math.round(m / 5) * 5
  return { hour, minute, ampm }
}

function toDisplay(hour: number, minute: number, ampm: "AM" | "PM"): string {
  return `${hour}:${String(minute).padStart(2, "0")} ${ampm}`
}

function to24h(hour: number, minute: number, ampm: "AM" | "PM"): string {
  let h = hour % 12
  if (ampm === "PM") h += 12
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

// A single scroll-wheel drum
function Drum({
  items,
  selected,
  onSelect,
  format,
}: {
  items: number[]
  selected: number
  onSelect: (v: number) => void
  format: (v: number) => string
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startScroll = useRef(0)

  // Scroll to selected item
  const scrollTo = useCallback((value: number, smooth: boolean) => {
    const idx = items.indexOf(value)
    if (idx === -1 || !listRef.current) return
    listRef.current.scrollTo({
      top: idx * ITEM_H,
      behavior: smooth ? "smooth" : "instant",
    })
  }, [items])

  useEffect(() => {
    scrollTo(selected, false)
  }, [selected, scrollTo])

  const handleScroll = () => {
    if (!listRef.current) return
    const idx = Math.round(listRef.current.scrollTop / ITEM_H)
    const clamped = Math.max(0, Math.min(idx, items.length - 1))
    if (items[clamped] !== selected) onSelect(items[clamped])
  }

  // Touch / mouse drag
  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true
    startY.current = e.clientY
    startScroll.current = listRef.current?.scrollTop ?? 0
    listRef.current?.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !listRef.current) return
    const dy = startY.current - e.clientY
    listRef.current.scrollTop = startScroll.current + dy
  }
  const onPointerUp = () => {
    isDragging.current = false
    handleScroll()
  }

  return (
    <div className="relative w-16 select-none">
      {/* Fade top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 z-10"
        style={{ background: "linear-gradient(to bottom, white 0%, transparent 100%)" }} />
      {/* Selected highlight */}
      <div className="pointer-events-none absolute inset-x-0 z-10 rounded-lg border border-primary/30 bg-primary/8"
        style={{ top: ITEM_H, height: ITEM_H }} />
      {/* Fade bottom */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 z-10"
        style={{ background: "linear-gradient(to top, white 0%, transparent 100%)" }} />

      <div
        ref={listRef}
        onScroll={handleScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="overflow-y-scroll cursor-grab active:cursor-grabbing"
        style={{
          height: ITEM_H * 3,
          scrollSnapType: "y mandatory",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* top padding so first item can center */}
        <div style={{ height: ITEM_H }} />
        {items.map((v) => (
          <div
            key={v}
            onClick={() => { onSelect(v); scrollTo(v, true) }}
            style={{ height: ITEM_H, scrollSnapAlign: "center" }}
            className={`flex items-center justify-center text-xl font-medium transition-colors ${
              v === selected ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {format(v)}
          </div>
        ))}
        {/* bottom padding so last item can center */}
        <div style={{ height: ITEM_H }} />
      </div>
    </div>
  )
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const [hour, setHour] = useState(7)
  const [minute, setMinute] = useState(0)
  const [ampm, setAmpm] = useState<"AM" | "PM" | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const onClose = (shouldCommit: boolean) => {
    if (shouldCommit && ampm) {
      onChange(to24h(hour, minute, ampm))
    }
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return

    // If there's no existing time yet, show a blank AM/PM choice.
    if (!value || value === "TBD") {
      setHour(7)
      setMinute(0)
      setAmpm(null)
      return
    }

    const parsed = parseValue(value)
    setHour(parsed.hour)
    setMinute(parsed.minute)
    setAmpm(parsed.ampm)
  }, [value, open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        // If AM/PM isn't selected, dismiss without changing the field.
        onClose(!!ampm)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, ampm, hour, minute, onClose, onChange])

  const handleTBD = () => {
    onChange("TBD")
    setAmpm(null)
    setOpen(false)
  }

  const displayLabel =
    value === "TBD"
      ? "TBD"
      : value
      ? toDisplay(...Object.values(parseValue(value)) as [number, number, "AM" | "PM"])
      : "Select time"

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          if (open) onClose(!!ampm)
          else setOpen(true)
        }}
        className="flex w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-left hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {displayLabel}
        </span>
      </button>

      {/* Popup */}
      {open && (
        <div className="absolute z-50 mt-1 rounded-xl border border-border bg-white shadow-xl"
          style={{ width: 230 }}>

          {/* Drums row */}
          <div className="flex items-center justify-center gap-1 px-4 pt-3 pb-2">
            <Drum
              items={HOURS}
              selected={hour}
              onSelect={(v) => {
                setHour(v)
              }}
              format={(v) => String(v)}
            />
            <span className="text-xl font-semibold text-muted-foreground pb-0.5">:</span>
            <Drum
              items={MINUTES}
              selected={minute}
              onSelect={(v) => {
                setMinute(v)
              }}
              format={(v) => String(v).padStart(2, "0")}
            />
          </div>

          {/* AM / PM / TBD row */}
          <div className="flex items-center justify-end border-t border-border px-4 py-2 gap-2">
            {/* AM/PM toggle */}
            <div className="flex rounded-md overflow-hidden border border-border">
              {(["AM", "PM"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setAmpm(p)
                    // AM/PM selection commits the time and dismisses the picker.
                    onChange(to24h(hour, minute, p))
                    setOpen(false)
                  }}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    ampm === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* TBD button */}
            <button
              type="button"
              onClick={handleTBD}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-border bg-background text-muted-foreground hover:bg-muted transition-colors"
            >
              TBD
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
