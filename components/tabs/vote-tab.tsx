"use client"

import { useState } from "react"
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
import { Heart, Trophy, Calendar, Lightbulb, Plus, X, Loader2, Search } from "lucide-react"
import { BookCover } from "@/components/book-cover"
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

type GoogleBookMatch = {
  id: string
  title: string
  author: string
  publishedYear?: string
  description?: string
  coverUrl?: string
}

async function searchGoogleBooks(title: string, author: string): Promise<GoogleBookMatch[]> {
  try {
    const query = encodeURIComponent(`${title} ${author}`.trim())
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5`,
    )
    const data = await response.json()
    const items = (data.items ?? []) as any[]
    return items.slice(0, 5).map((item) => {
      const volumeInfo = item.volumeInfo ?? {}
      const descriptionRaw: string | undefined = volumeInfo.description
      const shortDesc =
        descriptionRaw && descriptionRaw.length > 200
          ? descriptionRaw.substring(0, 200).trim() + "..."
          : descriptionRaw
      const publishedDate: string | undefined = volumeInfo.publishedDate
      const publishedYear =
        typeof publishedDate === "string" ? publishedDate.slice(0, 4) : undefined
      const coverUrl: string | undefined = volumeInfo.imageLinks?.thumbnail
      const authors: string[] | undefined = volumeInfo.authors
      const firstAuthor = (authors && authors.length > 0 ? authors[0] : author) ?? author
      return {
        id: item.id ?? `${volumeInfo.title ?? title}-${firstAuthor}`,
        title: volumeInfo.title ?? title,
        author: firstAuthor,
        publishedYear,
        description: shortDesc,
        coverUrl,
      }
    })
  } catch (error) {
    console.error("Failed to search Google Books:", error)
    return []
  }
}

export function VoteTab({ suggestions, votes, userName, onVote, onScheduleMeeting, onSuggest, onDelete }: VoteTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({ title: "", author: "" })
  const [searchResults, setSearchResults] = useState<GoogleBookMatch[]>([])
  const [selectedBook, setSelectedBook] = useState<GoogleBookMatch | null>(null)
  const [bookToDelete, setBookToDelete] = useState<string | null>(null)

  const getVoteCount = (bookId: string) => votes.filter(v => v.bookId === bookId).length
  const getVoterNames = (bookId: string) => votes.filter(v => v.bookId === bookId).map(v => v.voterName)
  const hasVoted = (bookId: string) => votes.some(v => v.bookId === bookId && v.voterName === userName)

  const sortedSuggestions = [...suggestions].sort((a, b) => getVoteCount(b.id) - getVoteCount(a.id))
  const leadingBookId = sortedSuggestions[0]?.id
  const maxVotes = getVoteCount(leadingBookId)

  const handleSearch = async () => {
    if (!formData.title || !formData.author) return
    setIsLoading(true)
    try {
      const results = await searchGoogleBooks(formData.title, formData.author)
      setSearchResults(results)
      setSelectedBook(null)
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

  return (
    <div className="space-y-4">
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
            setSearchResults([])
            setSelectedBook(null)
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
                  setSearchResults([])
                  setSelectedBook(null)
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
                    setSearchResults([])
                    setSelectedBook(null)
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
                    setSearchResults([])
                    setSelectedBook(null)
                  }}
                />
              </div>

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
                  disabled={!formData.title || !formData.author || isLoading}
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
                    setSearchResults([])
                    setSelectedBook(null)
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
                  <div className="flex gap-4">
                    <BookCover
                      title={book.title}
                      author={book.author}
                      coverUrl={book.coverUrl}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {isLeading && (
                              <Trophy className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                            <h3 className="font-serif text-lg font-semibold text-foreground truncate">
                              {book.title}
                            </h3>
                          </div>
                          <p className="text-muted-foreground text-sm">{book.author}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Suggested by {book.suggestedBy}
                          </p>
                        </div>
                      </div>
                      {book.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                          {book.description}
                        </p>
                      )}
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-1 text-sm">
                          <span className="font-semibold text-primary">{voteCount}</span>
                          <span className="text-muted-foreground">
                            {voteCount === 1 ? 'vote' : 'votes'}
                          </span>
                        </div>
                        {voterNames.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Voted by: {voterNames.join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <Button
                          variant={voted ? "default" : "outline"}
                          size="sm"
                          onClick={() => onVote(book.id)}
                          className={`gap-2 ${voted ? 'bg-primary hover:bg-primary/90' : ''}`}
                        >
                          <Heart className={`h-4 w-4 ${voted ? 'fill-current' : ''}`} />
                          {voted ? 'Voted' : 'Vote'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onScheduleMeeting(book)}
                          className="gap-2"
                        >
                          <Calendar className="h-4 w-4" />
                          Schedule a Meeting
                        </Button>
                      </div>
                    </div>
                  </div>
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
