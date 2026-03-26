"use client"

import { Card, CardContent } from "@/components/ui/card"
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
import { Archive, Star, Calendar, MapPin, User, X } from "lucide-react"
import { BookCover } from "@/components/book-cover"
import type { Meeting } from "@/lib/types"
import { useState } from "react"

interface ArchiveTabProps {
  archive: Meeting[]
  onDeleteMeeting: (meetingId: string) => void
}

function getOrdinalSuffix(n: number) {
  // English ordinal suffixes: 1st, 2nd, 3rd, 4th...
  const j = n % 10
  const k = n % 100
  if (j === 1 && k !== 11) return "st"
  if (j === 2 && k !== 12) return "nd"
  if (j === 3 && k !== 13) return "rd"
  return "th"
}

function formatArchiveDate(dateStr: string) {
  // We store either:
  // - "YYYY-MM-DD" from the date input
  // - "March 13th" / "Friday, March 13th" for seeded data
  if (!dateStr) return dateStr
  if (dateStr.includes("-")) {
    // Force local midnight to avoid timezone shifting the day.
    const d = new Date(`${dateStr}T00:00:00`)
    if (Number.isNaN(d.getTime())) return dateStr
    const month = d.toLocaleDateString("en-US", { month: "long" })
    const day = d.getDate()
    const year = d.getFullYear()
    return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`
  }

  // Seeded format without a year, e.g.:
  // - "March 13th"
  // - "Friday, March 13th"
  const cleaned = dateStr.trim()
  const monthIndex: Record<string, number> = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
  }

  // Grab the month + day from either string.
  // Example match groups:
  // - month = "march", dayNum = "13"
  const monthMatch = cleaned.toLowerCase().match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/,
  )
  const dayMatch = cleaned.match(/\b(\d{1,2})(st|nd|rd|th)?\b/i)

  if (monthMatch && dayMatch) {
    const monthNameLower = monthMatch[1]
    const monthIdx = monthIndex[monthNameLower]
    const dayNum = Number(dayMatch[1])
    const year = new Date().getFullYear()

    if (monthIdx !== undefined && !Number.isNaN(dayNum)) {
      const d = new Date(year, monthIdx, dayNum, 0, 0, 0, 0)
      const month = d.toLocaleDateString("en-US", { month: "long" })
      return `${month} ${dayNum}${getOrdinalSuffix(dayNum)}, ${year}`
    }
  }

  return dateStr
}

export function ArchiveTab({ archive, onDeleteMeeting }: ArchiveTabProps) {
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null)

  const handleConfirmDelete = () => {
    if (meetingToDelete) {
      onDeleteMeeting(meetingToDelete)
      setMeetingToDelete(null)
    }
  }

  if (archive.length === 0) {
    return (
      <div className="text-center py-12">
        <Archive className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <h3 className="font-serif text-xl text-foreground mb-2">No books in the archive yet</h3>
        <p className="text-muted-foreground">Past book club picks will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!meetingToDelete}
        onOpenChange={(open) => !open && setMeetingToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The meeting and all RSVPs will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="text-center mb-6">
        <h2 className="font-serif text-2xl text-foreground mb-2">Books We&apos;ve Read</h2>
        <p className="text-muted-foreground">A look back at our literary journey together</p>
      </div>

      <div className="grid gap-4">
        {archive.map((meeting) => (
          <Card key={meeting.id} className="overflow-hidden relative">
            {/* Delete Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => setMeetingToDelete(meeting.id)}
            >
              <X className="h-4 w-4" />
            </Button>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div>
                  <BookCover 
                    title={meeting.book.title} 
                    author={meeting.book.author} 
                    coverUrl={meeting.book.coverUrl}
                    size="lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-xl font-semibold text-foreground mb-1">
                    {meeting.book.title}
                  </h3>
                  <p className="text-muted-foreground">{meeting.book.author}</p>
                  
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Read on {formatArchiveDate(meeting.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{meeting.location}</span>
                    </div>
                    {meeting.book.suggestedBy && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Suggested by {meeting.book.suggestedBy}</span>
                      </div>
                    )}
                  </div>

                  {meeting.book.rating && (
                    <div className="mt-3 flex items-center gap-1">
                      <span className="text-sm text-muted-foreground mr-1">Club rating:</span>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star}
                          className={`h-4 w-4 ${
                            star <= meeting.book.rating! 
                              ? 'text-primary fill-primary' 
                              : 'text-muted-foreground/30'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {meeting.wineTheme && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                      Wine pairing: {meeting.wineTheme}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground mt-8 p-4 bg-muted/50 rounded-lg">
        <p className="font-serif text-lg text-foreground mb-1">
          {archive.length} {archive.length === 1 ? 'book' : 'books'} read together
        </p>
        <p>Here&apos;s to many more wine-fueled discussions!</p>
      </div>
    </div>
  )
}
