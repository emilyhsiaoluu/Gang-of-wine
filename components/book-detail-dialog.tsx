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

async function searchOpenLibrary(query: URLSearchParams): Promise<{ key?: string; firstSentence?: string } | null> {
  const res = await fetch(`https://openlibrary.org/search.json?${query}`)
  if (!res.ok) return null
  const data = await res.json()
  const doc = data.docs?.[0]
  if (!doc) return null
  const fs = doc.first_sentence
  const firstSentence = Array.isArray(fs) ? fs[0] : typeof fs === "string" ? fs : undefined
  return { key: doc.key ?? undefined, firstSentence }
}

async function fetchWorksDescription(key: string): Promise<string | null> {
  try {
    const res = await fetch(`https://openlibrary.org${key}.json`)
    if (!res.ok) return null
    const works = await res.json()
    const desc = works.description
    if (typeof desc === "string" && desc.trim()) return desc.trim()
    if (typeof desc?.value === "string" && desc.value.trim()) return desc.value.trim()
  } catch { /* ignore */ }
  return null
}

async function fetchBookDescription(title: string, author: string): Promise<string | null> {
  try {
    // 1. Search with title + author
    let result = await searchOpenLibrary(
      new URLSearchParams({ title: title.trim(), author: author.trim(), limit: "1" })
    )

    // 2. If no result, try title only (some authors have name-format mismatches)
    if (!result) {
      result = await searchOpenLibrary(
        new URLSearchParams({ title: title.trim(), limit: "1" })
      )
    }

    if (!result) return null

    // 3. Try Works endpoint for a proper description
    if (result.key) {
      const desc = await fetchWorksDescription(result.key)
      if (desc) return desc
    }

    // 4. Fall back to first_sentence from search results
    if (result.firstSentence) return result.firstSentence
  } catch { /* network error */ }
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
              src={coverUrl.replace(/-[SM]\.jpg$/, '-L.jpg')}
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
