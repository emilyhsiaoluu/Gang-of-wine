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

async function tryFetchDescription(q: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ q, maxResults: "1" })
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    const desc = data.items?.[0]?.volumeInfo?.description
    return typeof desc === "string" && desc.trim() ? desc.trim() : null
  } catch {
    return null
  }
}

async function fetchBookDescription(title: string, author: string): Promise<string | null> {
  // 1. Try title + author
  const q1 = [
    title.trim() ? `intitle:${title.trim()}` : "",
    author.trim() ? `inauthor:${author.trim()}` : "",
  ].filter(Boolean).join("+")
  const desc1 = await tryFetchDescription(q1)
  if (desc1) return desc1

  // 2. Title only (handles author name format mismatches)
  if (author.trim()) {
    const desc2 = await tryFetchDescription(`intitle:${title.trim()}`)
    if (desc2) return desc2
  }

  return null
}

function getHighResCoverUrl(url: string): string {
  if (url.includes("books.google.com")) {
    return url.replace(/&edge=curl/, "").replace(/zoom=\d+/, "zoom=5")
  }
  return url.replace(/-[SM]\.jpg$/, "-L.jpg")
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
              src={getHighResCoverUrl(coverUrl)}
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
