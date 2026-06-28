"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

interface BookDetailDialogProps {
  open: boolean
  onClose: () => void
  title: string
  author: string
  coverUrl?: string
}

async function fetchBookDescription(title: string, author: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ title: title.trim(), author: author.trim(), limit: "1" })
    const res = await fetch(`https://openlibrary.org/search.json?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    const doc = data.docs?.[0]
    if (!doc?.key) return null

    const worksRes = await fetch(`https://openlibrary.org${doc.key}.json`)
    if (!worksRes.ok) return null
    const works = await worksRes.json()

    const desc = works.description
    if (typeof desc === "string") return desc
    if (desc?.value) return desc.value
  } catch {
    // network error — just show no description
  }
  return null
}

export function BookDetailDialog({ open, onClose, title, author, coverUrl }: BookDetailDialogProps) {
  const [description, setDescription] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setDescription(null)
    setLoading(true)
    fetchBookDescription(title, author).then((desc) => {
      setDescription(desc)
      setLoading(false)
    })
  }, [open, title, author])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl leading-tight">{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">by {author}</p>
        </DialogHeader>

        <div className="flex gap-4 items-start">
          {coverUrl && (
            <img
              src={coverUrl}
              alt={`${title} cover`}
              className="w-24 h-36 object-cover rounded-lg shadow-md border border-border/50 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading details…
              </div>
            ) : description ? (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-[12]">
                {description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No description available.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
