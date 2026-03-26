"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, Trophy, Calendar } from "lucide-react"
import { BookCover } from "@/components/book-cover"
import type { SuggestedBook, Vote } from "@/lib/types"

interface VoteTabProps {
  suggestions: SuggestedBook[]
  votes: Vote[]
  userName: string
  onVote: (bookId: string) => void
  onScheduleMeeting: (book: SuggestedBook) => void
}

export function VoteTab({ suggestions, votes, userName, onVote, onScheduleMeeting }: VoteTabProps) {
  const getVoteCount = (bookId: string) => votes.filter(v => v.bookId === bookId).length
  const getVoterNames = (bookId: string) => votes.filter(v => v.bookId === bookId).map(v => v.voterName)
  const hasVoted = (bookId: string) => votes.some(v => v.bookId === bookId && v.voterName === userName)
  
  const sortedSuggestions = [...suggestions].sort((a, b) => getVoteCount(b.id) - getVoteCount(a.id))
  const leadingBookId = sortedSuggestions[0]?.id
  const maxVotes = getVoteCount(leadingBookId)

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <h3 className="font-serif text-xl text-foreground mb-2">No books to vote on yet</h3>
        <p className="text-muted-foreground">Head to the Suggest tab to add some books.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="font-serif text-2xl text-foreground mb-2">Vote &amp; Schedule</h2>
        <p className="text-muted-foreground">
          Tap the heart to vote. When you&apos;re ready, schedule the meeting for the book with the most votes.
        </p>
      </div>

      {sortedSuggestions.map((book) => {
        const voteCount = getVoteCount(book.id)
        const voterNames = getVoterNames(book.id)
        const isLeading = book.id === leadingBookId && maxVotes > 0
        const voted = hasVoted(book.id)

        return (
          <Card 
            key={book.id} 
            className={`transition-all ${isLeading ? 'ring-2 ring-primary bg-primary/5' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex gap-4">
                <BookCover 
                  title={book.title} 
                  author={book.author} 
                  coverUrl={book.coverUrl}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
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
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
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
                    {/* Show voter names */}
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
                      {voted ? 'Voted' : 'Vote & Schedule'}
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
    </div>
  )
}
