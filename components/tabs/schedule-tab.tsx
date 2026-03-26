"use client"

import { useState, useEffect } from "react"
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
import { MapPin, Clock, Calendar, X } from "lucide-react"
import { BookCover } from "@/components/book-cover"
import type { Meeting, SuggestedBook } from "@/lib/types"
import { TimePicker } from "@/components/time-picker"

interface ScheduleTabProps {
  meetings: Meeting[]
  userName: string
  onAddMeeting: (meeting: Omit<Meeting, "id" | "rsvps">) => void
  onRSVP: (meetingId: string, response: "yes" | "no" | "maybe", rsvpName: string) => void
  onDeleteMeeting: (meetingId: string) => void
  onUpdateMeeting: (meetingId: string, updates: Partial<Omit<Meeting, "id" | "rsvps" | "book">>) => void
  prefillBook?: SuggestedBook | null
  onPrefillUsed?: () => void
  onSuggestionScheduled?: (bookId: string) => void
}

export function ScheduleTab({ 
  meetings, 
  userName, 
  onAddMeeting, 
  onRSVP, 
  onDeleteMeeting,
  onUpdateMeeting,
  prefillBook,
  onPrefillUsed,
  onSuggestionScheduled,
}: ScheduleTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null)
  const [prefillBookId, setPrefillBookId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    bookTitle: "",
    bookAuthor: "",
    bookCoverUrl: "",
    date: "",
    time: "",
    location: "",
  })
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null)

  // Handle prefill from Vote tab
  useEffect(() => {
    if (prefillBook) {
      setFormData({
        bookTitle: prefillBook.title,
        bookAuthor: prefillBook.author,
        bookCoverUrl: prefillBook.coverUrl || "",
        date: "",
        time: "",
        location: "",
      })
      setPrefillBookId(prefillBook.id)
      setEditingMeetingId(null)
      setShowForm(true)
      onPrefillUsed?.()
    }
  }, [prefillBook, onPrefillUsed])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const timeValue = formData.time || "TBD"
    
    if (formData.bookTitle && formData.bookAuthor && formData.date && timeValue && formData.location) {
      if (editingMeetingId) {
        // Updating existing meeting
        onUpdateMeeting(editingMeetingId, {
          date: formData.date,
          time: timeValue,
          location: formData.location,
        })
        setEditingMeetingId(null)
      } else {
        // Adding new meeting
        onAddMeeting({
          book: {
            id: `book-${Date.now()}`,
            title: formData.bookTitle,
            author: formData.bookAuthor,
            coverUrl: formData.bookCoverUrl || `https://covers.openlibrary.org/b/title/${encodeURIComponent(formData.bookTitle)}-M.jpg`,
          },
          date: formData.date,
          time: timeValue,
          location: formData.location,
        })
        if (prefillBookId) {
          onSuggestionScheduled?.(prefillBookId)
          setPrefillBookId(null)
        }
      }
      setFormData({ bookTitle: "", bookAuthor: "", bookCoverUrl: "", date: "", time: "", location: "" })
      setShowForm(false)
    }
  }

  const handleEditMeeting = (meeting: Meeting) => {
    setFormData({
      bookTitle: meeting.book.title,
      bookAuthor: meeting.book.author,
      date: meeting.date,
      time: meeting.time === "TBD" ? "TBD" : meeting.time,
      location: meeting.location,
    })
    setEditingMeetingId(meeting.id)
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setFormData({ bookTitle: "", bookAuthor: "", bookCoverUrl: "", date: "", time: "", location: "" })
    setEditingMeetingId(null)
    setShowForm(false)
  }

  const handleConfirmDelete = () => {
    if (meetingToDelete) {
      onDeleteMeeting(meetingToDelete)
      setMeetingToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="font-serif text-2xl text-foreground mb-2">RSVP</h2>
        {meetings.length > 0 && (
          <>
            <p className="text-muted-foreground">Edit time &amp; location by tapping on it</p>
            <p className="text-muted-foreground text-sm mt-1">Edit RSVP by writing your name again</p>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!meetingToDelete} onOpenChange={(open) => !open && setMeetingToDelete(null)}>
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

      {/* Add/Edit Meeting Form */}
      {showForm && (
        <Card className="border-primary/20 bg-card">
          <CardContent className="pt-6">
            <h3 className="font-serif text-xl font-semibold mb-4 text-foreground">
              {editingMeetingId ? "Edit Meeting" : "Schedule a Meeting"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bookTitle">Book Title</Label>
                  <Input
                    id="bookTitle"
                    placeholder="Enter book title"
                    value={formData.bookTitle}
                    onChange={(e) => setFormData({ ...formData, bookTitle: e.target.value })}
                    disabled={!!editingMeetingId}
                    className={editingMeetingId ? "bg-muted" : ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bookAuthor">Author</Label>
                  <Input
                    id="bookAuthor"
                    placeholder="Enter author name"
                    value={formData.bookAuthor}
                    onChange={(e) => setFormData({ ...formData, bookAuthor: e.target.value })}
                    disabled={!!editingMeetingId}
                    className={editingMeetingId ? "bg-muted" : ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <TimePicker
                    value={formData.time}
                    onChange={(v) => setFormData({ ...formData, time: v })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Emily's House"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit">{editingMeetingId ? "Save Changes" : "Add Meeting"}</Button>
                <Button type="button" variant="outline" onClick={handleCancelForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {meetings.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="text-center mb-8">
              <h3 className="font-serif text-xl text-foreground mb-2">No meetings yet</h3>
            <p className="text-muted-foreground">Head to Vote to schedule the next meeting.</p>
          </div>
        </div>
      ) : (
        /* Meeting Cards */
        meetings.map((meeting) => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            userName={userName}
            onRSVP={onRSVP}
            onDelete={() => setMeetingToDelete(meeting.id)}
            onEdit={() => handleEditMeeting(meeting)}
          />
        ))
      )}
    </div>
  )
}

interface MeetingCardProps {
  meeting: Meeting
  userName: string
  onRSVP: (meetingId: string, response: "yes" | "no" | "maybe", rsvpName: string) => void
  onDelete: () => void
  onEdit: () => void
}

function MeetingCard({ meeting, userName, onRSVP, onDelete, onEdit }: MeetingCardProps) {
  const [rsvpName, setRsvpName] = useState(userName)
  const currentRsvp = meeting.rsvps.find(r => r.name === rsvpName)

  const formatDate = (dateStr: string) => {
    // Check if it's already a formatted date string like "March 13th"
    if (dateStr.includes(" ")) {
      return dateStr
    }
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  const formatTime = (timeStr: string) => {
    if (timeStr === "TBD") return "TBD"
    // Check if it's already formatted like "7:00 PM"
    if (timeStr.includes(" ")) {
      return timeStr
    }
    const [hours, minutes] = timeStr.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const handleRSVP = (response: "yes" | "no" | "maybe") => {
    onRSVP(meeting.id, response, rsvpName)
    setRsvpName("") // Reset name field after RSVP
  }

  return (
    <Card className="overflow-hidden relative">
      {/* Delete Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={onDelete}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Book Cover */}
          <div className="sm:w-32 flex-shrink-0 p-4 flex justify-center sm:justify-start">
            <BookCover 
              title={meeting.book.title}
              author={meeting.book.author}
              coverUrl={meeting.book.coverUrl}
              size="md" 
            />
          </div>

          {/* Content */}
          <div className="flex-1 p-4 sm:pl-0 pr-10">
            <h3 className="font-serif text-xl font-semibold text-foreground mb-1">
              {meeting.book.title}
            </h3>
            <p className="text-muted-foreground mb-4">by {meeting.book.author}</p>

            {/* Tappable meeting details */}
            <div className="flex flex-wrap gap-2 text-sm mb-4">
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Calendar className="h-4 w-4" />
                {formatDate(meeting.date)}
              </button>
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Clock className="h-4 w-4" />
                {formatTime(meeting.time)}
              </button>
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                <MapPin className="h-4 w-4" />
                {meeting.location}
              </button>
            </div>

            {/* RSVP Section */}
            <div className="border-t border-border pt-4">
              <p className="text-sm font-medium text-foreground mb-3">RSVP</p>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  value={rsvpName}
                  onChange={(e) => setRsvpName(e.target.value)}
                  placeholder="Your name"
                  className="w-36 h-9 text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={currentRsvp?.response === "yes" ? "default" : "outline"}
                    onClick={() => handleRSVP("yes")}
                    disabled={!rsvpName.trim()}
                    className="h-9"
                  >
                    Yes
                  </Button>
                  <Button
                    size="sm"
                    variant={currentRsvp?.response === "maybe" ? "default" : "outline"}
                    onClick={() => handleRSVP("maybe")}
                    disabled={!rsvpName.trim()}
                    className="h-9"
                  >
                    Maybe
                  </Button>
                  <Button
                    size="sm"
                    variant={currentRsvp?.response === "no" ? "default" : "outline"}
                    onClick={() => handleRSVP("no")}
                    disabled={!rsvpName.trim()}
                    className="h-9"
                  >
                    No
                  </Button>
                </div>
              </div>
              {meeting.rsvps.length > 0 && (
                <div className="mt-3 text-sm text-muted-foreground">
                  <span className="font-medium">RSVPs: </span>
                  {meeting.rsvps.map((rsvp, i) => (
                    <span key={rsvp.name}>
                      {rsvp.name} ({rsvp.response})
                      {i < meeting.rsvps.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
