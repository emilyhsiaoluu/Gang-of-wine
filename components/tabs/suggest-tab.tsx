"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { Lightbulb, Plus, X, Loader2, Search } from "lucide-react"
import { BookCover } from "@/components/book-cover"
import type { SuggestedBook } from "@/lib/types"

interface SuggestTabProps {
  suggestions: SuggestedBook[]
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

export function SuggestTab({ suggestions, onSuggest, onDelete }: SuggestTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    author: "",
  })
  const [searchResults, setSearchResults] = useState<GoogleBookMatch[]>([])
  const [selectedBook, setSelectedBook] = useState<GoogleBookMatch | null>(null)
  const [bookToDelete, setBookToDelete] = useState<string | null>(null)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedBook) {
      handleConfirmAdd()
      return
    }
    await handleSearch()
  }

  const handleConfirmDelete = () => {
    if (bookToDelete) {
      onDelete(bookToDelete)
      setBookToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
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

      {/* Suggest Button / Form */}
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
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Suggestion
                    </>
                  )}
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
            </form>
          </CardContent>
        </Card>
      )}

      {/* Suggestions List */}
      {suggestions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No book suggestions yet. Be the first to suggest one!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-serif text-lg font-semibold text-foreground">
            Suggested Books ({suggestions.length})
          </h3>
          {suggestions.map((book) => (
            <Card key={book.id} className="overflow-hidden relative">
              {/* Delete Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10"
                onClick={() => setBookToDelete(book.id)}
              >
                <X className="h-4 w-4" />
              </Button>

              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row">
                  {/* Book Cover */}
                  <div className="sm:w-28 flex-shrink-0 p-4 flex justify-center sm:justify-start">
                    <BookCover 
                      title={book.title}
                      author={book.author}
                      coverUrl={book.coverUrl}
                      size="sm" 
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 sm:pl-0 pr-10">
                    <h4 className="font-serif text-lg font-semibold text-foreground mb-0.5">
                      {book.title}
                    </h4>
                    <p className="text-muted-foreground text-sm mb-2">by {book.author}</p>
                    {book.description && (
                      <p className="text-sm text-foreground/80 mb-2 line-clamp-5">
                        {book.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Suggested by <span className="font-medium">{book.suggestedBy}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
