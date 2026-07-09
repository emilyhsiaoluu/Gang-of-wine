"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Heart, Trophy, Calendar, Lightbulb, Plus, X, Loader2, Search, Star, Share2 } from "lucide-react"
import { BookCover } from "@/components/book-cover"
import { BookDetailDialog } from "@/components/book-detail-dialog"
import { CardActionBar } from "@/components/card-action-bar"
import type { SuggestedBook, Vote } from "@/lib/types"

interface VoteTabProps {
  suggestions: SuggestedBook[]
  votes: Vote[]
  userName: string
  onVote: (bookId: string) => void
  onScheduleMeeting: (book: SuggestedBook) => void
  onSuggest: (book: Omit<SuggestedBook, "id" | "suggestedBy">) => void
  onDelete: (bookId: string) => void
}

type BookMatch = {
  id: string
  title: string
  author: string
  publishedYear?: string
  description?: string
  coverUrl?: string
}

async function searchBooks(title: string, author: string): Promise<BookMatch[]> {
  const params = new URLSearchParams({ limit: "5" })
  if (title.trim()) params.set("title", title.trim())
  if (author.trim()) params.set("author", author.trim())
  const response = await fetch(`https://openlibrary.org/search.json?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Open Library returned ${response.status} ${response.statusText}`)
  }
  const data = await response.json()
  const docs = (data.docs ?? []) as any[]
  return docs.slice(0, 5).map((doc) => {
    const firstAuthor =
      Array.isArray(doc.author_name) && doc.author_name.length > 0 ? doc.author_name[0] : author
    const year =
      typeof doc.first_publish_year === "number" ? String(doc.first_publish_year) : undefined
    const coverUrl =
      typeof doc.cover_i === "number"
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : undefined
    const id = typeof doc.key === "string" ? doc.key : `${doc.title}-${firstAuthor}`
    return {
      id,
      title: typeof doc.title === "string" ? doc.title : title,
      author: firstAuthor,
      publishedYear: year,
      coverUrl,
    }
  })
}

type CardBookData = {
  description: string | null
  subjects: string[]
  rating: number | null
}

async function fetchCardData(title: string, author: string): Promise<CardBookData> {
  const empty: CardBookData = { description: null, subjects: [], rating: null }
  try {
    const params = new URLSearchParams({ title: title.trim(), author: author.trim(), limit: "1" })
    const res = await fetch(`https://openlibrary.org/search.json?${params}`)
    if (!res.ok) return empty
    const data = await res.json()
    const doc = data.docs?.[0]
    if (!doc) return empty

    const subjects: string[] = Array.isArray(doc.subject)
      ? (doc.subject as string[]).filter((s) => s.length <= 25).slice(0, 3)
      : []

    const ratingAvg = typeof doc.ratings_average === "number" ? doc.ratings_average : null
    const ratingCount = typeof doc.ratings_count === "number" ? doc.ratings_count : 0
    const rating = ratingAvg !== null && ratingCount > 20
      ? Math.round(ratingAvg * 10) / 10
      : null

    let description: string | null = null
    if (doc.key) {
      try {
        const wRes = await fetch(`https://openlibrary.org${doc.key}.json`)
        if (wRes.ok) {
          const works = await wRes.json()
          const desc = works.description
          if (typeof desc === "string" && desc.trim()) description = desc.trim()
          else if (typeof desc?.value === "string" && desc.value.trim()) description = desc.value.trim()
        }
      } catch { /* ignore */ }
    }
    if (!description) {
      const fs = doc.first_sentence
      if (Array.isArray(fs) && fs[0]) description = String(fs[0])
      else if (typeof fs === "string") description = fs
    }

    return { description, subjects, rating }
  } catch {
    return empty
  }
}

export function VoteTab({ suggestions, votes, userName, onVote, onScheduleMeeting, onSuggest, onDelete }: VoteTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ title: "", author: "" })
  const [searchResults, setSearchResults] = useState<BookMatch[]>([])
  const [selectedBook, setSelectedBook] = useState<BookMatch | null>(null)
  const [bookToDelete, setBookToDelete] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [detailBook, setDetailBook] = useState<{ title: string; author: string; coverUrl?: string } | null>(null)
  const [cardData, setCardData] = useState<Record<string, CardBookData>>({})
  const fetchedIdsRef = useRef<Set<string>>(new Set())
  const [shareLabels, setShareLabels] = useState<Record<string, string>>({})

  useEffect(() => {
    suggestions.forEach((book) => {
      if (!fetchedIdsRef.current.has(book.id)) {
        fetchedIdsRef.current.add(book.id)
        fetchCardData(book.title, book.author).then((data) =>
          setCardData((prev) => ({ ...prev, [book.id]: data }))
        )
      }
    })
  }, [suggestions])

  const resetSearchState = () => {
    setSearchResults([])
    setSelectedBook(null)
    setSearchError(null)
    setHasSearched(false)
  }

  const getVoteCount = (bookId: string) => votes.filter(v => v.bookId === bookId).length
  const getVoterNames = (bookId: string) => votes.filter(v => v.bookId === bookId).map(v => v.voterName)
  const hasVoted = (bookId: string) => votes.some(v => v.bookId === bookId && v.voterName === userName)

  const maxVotes = suggestions.length > 0 ? Math.max(...suggestions.map(s => getVoteCount(s.id))) : 0

  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const aVotes = getVoteCount(a.id)
    const bVotes = getVoteCount(b.id)
    // Book(s) with the most votes stay at top
    if (aVotes === maxVotes && bVotes !== maxVotes) return -1
    if (bVotes === maxVotes && aVotes !== maxVotes) return 1
    // Everything else: most recently added first
    return (b.createdAt ?? "") > (a.createdAt ?? "") ? 1 : -1
  })
  const leadingBookId = maxVotes > 0 ? sortedSuggestions[0]?.id : undefined

  const handleSearch = async () => {
    if (!formData.title && !formData.author) return
    setIsLoading(true)
    setSearchError(null)
    setSelectedBook(null)
    try {
      const results = await searchBooks(formData.title, formData.author)
      setSearchResults(results)
      setHasSearched(true)
    } catch (error) {
      console.error("Failed to search Open Library:", error)
      const detail = error instanceof Error ? error.message : String(error)
      setSearchError(
        `Couldn't reach Open Library (${detail}). Check your network or any ad/privacy blockers, then try again.`,
      )
      setSearchResults([])
      setHasSearched(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmAdd = () => {
    if (!selectedBook) return
    onSuggest({
      title: selectedBook.title,
      author: selectedBook.author,
      description: selectedBook.description,
      coverUrl:
        selectedBook.coverUrl ??
        `https://covers.openlibrary.org/b/title/${encodeURIComponent(selectedBook.title)}-M.jpg`,
    })
    setFormData({ title: "", author: "" })
    setSearchResults([])
    setSelectedBook(null)
    setShowForm(false)
  }

  const handleConfirmDelete = () => {
    if (bookToDelete) {
      onDelete(bookToDelete)
      setBookToDelete(null)
    }
  }

  const handleShare = async (book: SuggestedBook) => {
    const title = `Vote for ${book.title}! 📚`
    const text = `${book.title} by ${book.author} was suggested — please vote for it! 📚🍷`

    const shareUrl = new URL(window.location.origin)
    shareUrl.searchParams.set("tab", "vote")
    if (book.coverUrl) {
      const raw = book.coverUrl
      const highRes = raw.includes("books.google.com")
        ? raw.replace(/&edge=curl/, "").replace(/zoom=\d+/, "zoom=5")
        : raw.replace(/-[SM]\.jpg$/, "-L.jpg")
      shareUrl.searchParams.set("ogImage", highRes)
    }

    if (!navigator.share) {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`).catch(() => {})
      setShareLabels((prev) => ({ ...prev, [book.id]: "Copied!" }))
      setTimeout(() => setShareLabels((prev) => ({ ...prev, [book.id]: "Share" })), 2000)
      return
    }

    try {
      await navigator.share({ title, text, url: shareUrl.toString() })
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Share failed:", err)
      }
    }
  }

  return (
    <div className="space-y-4">
      <BookDetailDialog
        open={!!detailBook}
        onClose={() => setDetailBook(null)}
        title={detailBook?.title ?? ""}
        author={detailBook?.author ?? ""}
        coverUrl={detailBook?.coverUrl}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!bookToDelete} onOpenChange={(open) => !open && setBookToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this book?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The book suggestion and all its votes will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="font-serif text-2xl text-foreground mb-2">Vote &amp; Schedule</h2>
        <p className="text-muted-foreground">
          Tap the heart to vote. When you&apos;re ready, schedule the meeting for the book with the most votes.
        </p>
      </div>

      {/* Suggest a Book */}
      {!showForm ? (
        <Button
          size="lg"
          className="w-full h-16 text-lg"
          onClick={() => {
            setFormData({ title: "", author: "" })
            resetSearchState()
            setShowForm(true)
          }}
        >
          <Lightbulb className="mr-2 h-5 w-5" />
          Suggest a Book
        </Button>
      ) : (
        <Card className="border-primary/20 bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl font-semibold text-foreground">Suggest a Book</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowForm(false)
                  resetSearchState()
                }}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Book Title</Label>
                <Input
                  id="title"
                  placeholder="Enter book title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value })
                    resetSearchState()
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  placeholder="Enter author name"
                  value={formData.author}
                  onChange={(e) => {
                    setFormData({ ...formData, author: e.target.value })
                    resetSearchState()
                  }}
                />
              </div>

              {searchError && (
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {searchError}
                </div>
              )}

              {hasSearched && !searchError && searchResults.length === 0 && (
                <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  No matches found. Double-check the spelling, or try fewer words.
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-sm font-medium text-foreground">Pick the correct book</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {searchResults.map((book) => {
                      const selected = selectedBook?.id === book.id
                      return (
                        <button
                          key={book.id}
                          type="button"
                          onClick={() => setSelectedBook(book)}
                          className={`w-full text-left rounded-lg border p-2 flex gap-3 items-start transition-colors ${
                            selected
                              ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          <BookCover
                            title={book.title}
                            author={book.author}
                            coverUrl={book.coverUrl}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1 pt-0.5">
                            <p className="font-serif text-sm font-semibold text-foreground truncate">
                              {book.title}
                            </p>
                            <p className="text-muted-foreground text-xs truncate">by {book.author}</p>
                            {book.publishedYear && (
                              <p className="text-muted-foreground text-[11px] mt-1">
                                Published {book.publishedYear}
                              </p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full h-12 text-base"
                  onClick={handleSearch}
                  disabled={(!formData.title && !formData.author) || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="w-full h-12 text-base"
                  onClick={handleConfirmAdd}
                  disabled={!selectedBook || isLoading}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Suggestion
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full h-12 text-base"
                  onClick={() => {
                    setShowForm(false)
                    resetSearchState()
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Book List */}
      {suggestions.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">No books suggested yet. Be the first!</p>
        </div>
      ) : (
        <>
          {sortedSuggestions.map((book) => {
            const voteCount = getVoteCount(book.id)
            const voterNames = getVoterNames(book.id)
            const isLeading = book.id === leadingBookId && maxVotes > 0
            const voted = hasVoted(book.id)

            return (
              <Card
                key={book.id}
                className={`transition-all relative ${isLeading ? 'ring-2 ring-primary bg-primary/5' : ''}`}
              >
                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10"
                  onClick={() => setBookToDelete(book.id)}
                >
                  <X className="h-4 w-4" />
                </Button>

                <CardContent className="p-4 pr-10">
                  {/* Tappable: cover + title + author + description */}
                  <div
                    className="flex gap-4 cursor-pointer"
                    onClick={() => setDetailBook({ title: book.title, author: book.author, coverUrl: book.coverUrl })}
                  >
                    <BookCover
                      title={book.title}
                      author={book.author}
                      coverUrl={book.coverUrl}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isLeading && <Trophy className="h-4 w-4 text-primary flex-shrink-0" />}
                        <h3 className="font-serif text-lg font-semibold text-foreground truncate">
                          {book.title}
                        </h3>
                      </div>
                      <p className="text-muted-foreground text-sm">{book.author}</p>
                      <p className="text-xs text-muted-foreground mt-1">Suggested by {book.suggestedBy}</p>
                      {cardData[book.id]?.description && (
                        <div className="mt-2">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {cardData[book.id].description}
                          </p>
                          <span className="text-xs text-primary font-medium">more</span>
                        </div>
                      )}
                      {(cardData[book.id]?.rating != null || (cardData[book.id]?.subjects.length ?? 0) > 0) && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {cardData[book.id]?.rating != null && (
                            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Star className="h-3 w-3 fill-primary text-primary" />
                              {cardData[book.id]?.rating}
                            </span>
                          )}
                          {cardData[book.id]?.subjects?.map((s) => (
                            <span key={s} className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action bar */}
                  <CardActionBar
                    actions={[
                      {
                        icon: Heart,
                        label: voted ? "Voted" : "Vote",
                        onClick: () => onVote(book.id),
                        active: voted,
                        count: voteCount,
                      },
                      { icon: Calendar, label: "Schedule", onClick: () => onScheduleMeeting(book) },
                      { icon: Share2, label: shareLabels[book.id] ?? "Share", onClick: () => handleShare(book) },
                    ]}
                    caption={voterNames.length > 0 ? <>Voted by {voterNames.join(", ")}</> : undefined}
                  />
                </CardContent>
              </Card>
            )
          })}

          <div className="text-center text-sm text-muted-foreground mt-6 p-4 bg-muted/50 rounded-lg">
            <p>Voting is open until the next meeting is scheduled.</p>
            <p className="mt-1">The book with the most votes wins.</p>
          </div>
        </>
      )}
    </div>
  )
}
