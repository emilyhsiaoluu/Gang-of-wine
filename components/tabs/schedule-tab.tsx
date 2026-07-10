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
import { MapPin, Clock, Calendar, X, Share2, Vote, Plus } from "lucide-react"
import { BookCover } from "@/components/book-cover"
import { BookDetailDialog } from "@/components/book-detail-dialog"
import { CardActionBar } from "@/components/card-action-bar"
import { DatePoll } from "@/components/date-poll"
import type { DateOption, Meeting, SuggestedBook } from "@/lib/types"
import { TimePicker } from "@/components/time-picker"

interface ScheduleTabProps {
  meetings: Meeting[]
  userName: string
  onAddMeeting: (meeting: Omit<Meeting, "id" | "rsvps">) => void
  onRSVP: (meetingId: string, response: "yes" | "no" | "maybe", rsvpName: string) => void
  onDeleteMeeting: (meetingId: string) => void
  onUpdateMeeting: (meetingId: string, updates: Partial<Omit<Meeting, "id" | "rsvps" | "book">>) => void
  onToggleDateVote: (meetingId: string, optionId: string) => void
  onFinalizeDate: (meetingId: string, date: string) => void
  onReopenPoll: (meetingId: string) => void
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
  onToggleDateVote,
  onFinalizeDate,
  onReopenPoll,
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
  const [dateMode, setDateMode] = useState<"single" | "poll">("single")
  const [pollDates, setPollDates] = useState<string[]>(["", ""])
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null)
  const [showReopenConfirm, setShowReopenConfirm] = useState(false)

  const editingMeeting = editingMeetingId ? meetings.find((m) => m.id === editingMeetingId) : null
  const canReopenPoll = !!editingMeeting?.date && (editingMeeting.dateOptions?.length ?? 0) > 0

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
    const isPollMode = dateMode === "poll" && !editingMeetingId
    const validPollDates = [...new Set(pollDates.filter(Boolean))]

    if (!formData.bookTitle || !formData.bookAuthor || !formData.location) return
    if (isPollMode ? validPollDates.length < 2 : !formData.date && !editingMeetingId) return

    if (editingMeetingId) {
      // Updating existing meeting. A polling meeting has no date yet — leave
      // it out of the update so the poll stays open.
      onUpdateMeeting(editingMeetingId, {
        ...(formData.date ? { date: formData.date } : {}),
        time: timeValue,
        location: formData.location,
      })
      setEditingMeetingId(null)
    } else {
      const dateOptions: DateOption[] | undefined = isPollMode
        ? validPollDates.sort().map((date, i) => ({ id: `opt-${Date.now()}-${i}`, date, voters: [] }))
        : undefined
      onAddMeeting({
        book: {
          id: `book-${Date.now()}`,
          title: formData.bookTitle,
          author: formData.bookAuthor,
          coverUrl: formData.bookCoverUrl || `https://covers.openlibrary.org/b/title/${encodeURIComponent(formData.bookTitle)}-M.jpg`,
        },
        date: isPollMode ? "" : formData.date,
        time: timeValue,
        location: formData.location,
        dateOptions,
      })
      if (prefillBookId) {
        onSuggestionScheduled?.(prefillBookId)
        setPrefillBookId(null)
      }
    }
    setFormData({ bookTitle: "", bookAuthor: "", bookCoverUrl: "", date: "", time: "", location: "" })
    setDateMode("single")
    setPollDates(["", ""])
    setShowForm(false)
  }

  const handleEditMeeting = (meeting: Meeting) => {
    setFormData({
      bookTitle: meeting.book.title,
      bookAuthor: meeting.book.author,
      bookCoverUrl: meeting.book.coverUrl || "",
      date: meeting.date,
      time: meeting.time === "TBD" ? "TBD" : meeting.time,
      location: meeting.location,
    })
    setEditingMeetingId(meeting.id)
    setDateMode("single")
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setFormData({ bookTitle: "", bookAuthor: "", bookCoverUrl: "", date: "", time: "", location: "" })
    setEditingMeetingId(null)
    setDateMode("single")
    setPollDates(["", ""])
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
          <p className="text-muted-foreground">Edit time &amp; location by tapping on it</p>
        )}
      </div>

      {/* Reopen Poll Confirmation Dialog */}
      <AlertDialog open={showReopenConfirm} onOpenChange={setShowReopenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen the date poll?</AlertDialogTitle>
            <AlertDialogDescription>
              The meeting goes back to voting on dates. Everyone&apos;s previous availability
              votes are kept — the gang can update them and a new date gets locked in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Never mind</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (editingMeetingId) onReopenPoll(editingMeetingId)
                setShowReopenConfirm(false)
                handleCancelForm()
              }}
            >
              Reopen poll
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              {/* Set a date vs. poll for dates */}
              {!editingMeetingId && (
                <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted">
                  <button
                    type="button"
                    onClick={() => setDateMode("single")}
                    className={`flex items-center justify-center gap-1.5 h-10 rounded-md text-sm font-medium transition-colors ${
                      dateMode === "single" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                    Set a date
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateMode("poll")}
                    className={`flex items-center justify-center gap-1.5 h-10 rounded-md text-sm font-medium transition-colors ${
                      dateMode === "poll" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    <Vote className="h-4 w-4" />
                    Poll for dates
                  </button>
                </div>
              )}

              {dateMode === "poll" && !editingMeetingId ? (
                <div className="space-y-2">
                  <Label>Date options (pick 2&ndash;4, the gang votes on availability)</Label>
                  {pollDates.map((date, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => {
                          const next = [...pollDates]
                          next[i] = e.target.value
                          setPollDates(next)
                        }}
                      />
                      {pollDates.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 flex-shrink-0 text-muted-foreground"
                          onClick={() => setPollDates(pollDates.filter((_, j) => j !== i))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {pollDates.length < 4 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setPollDates([...pollDates, ""])}
                    >
                      <Plus className="h-4 w-4" />
                      Add another date
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Emily's House"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={
                    !formData.bookTitle ||
                    !formData.bookAuthor ||
                    !formData.location ||
                    (dateMode === "poll" && !editingMeetingId
                      ? [...new Set(pollDates.filter(Boolean))].length < 2
                      : !formData.date && !editingMeetingId)
                  }
                >
                  {editingMeetingId ? "Save Changes" : dateMode === "poll" ? "Start Date Poll" : "Add Meeting"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancelForm}>
                  Cancel
                </Button>
              </div>
              {canReopenPoll && (
                <div className="border-t border-border pt-3 mt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-11 gap-1.5 text-primary hover:text-primary hover:bg-primary/10 -ml-3"
                    onClick={() => setShowReopenConfirm(true)}
                  >
                    <Vote className="h-4 w-4" />
                    Date no longer works? Reopen the poll
                  </Button>
                </div>
              )}
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
            onToggleDateVote={(optionId) => onToggleDateVote(meeting.id, optionId)}
            onFinalizeDate={(date) => onFinalizeDate(meeting.id, date)}
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
  onToggleDateVote: (optionId: string) => void
  onFinalizeDate: (date: string) => void
}

function MeetingCard({ meeting, userName, onRSVP, onDelete, onEdit, onToggleDateVote, onFinalizeDate }: MeetingCardProps) {
  const [rsvpName, setRsvpName] = useState(userName)
  const [shareLabel, setShareLabel] = useState("Share")
  const [detailOpen, setDetailOpen] = useState(false)
  const currentRsvp = meeting.rsvps.find(r => r.name === rsvpName)
  const isPolling = !meeting.date && (meeting.dateOptions?.length ?? 0) > 0

  const formatDate = (dateStr: string) => {
    // Check if it's already a formatted date string like "March 13th"
    if (dateStr.includes(" ")) {
      return dateStr
    }
    // Parse as local time (not UTC) to avoid date shifting for US timezones
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
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
  }

  const handleShare = async () => {
    const title = `Book Club: ${meeting.book.title}`
    const text = isPolling
      ? `Help pick a date for our next book club! Tap to vote on what works for you. 🗳️📚🍷\n\n📖 ${meeting.book.title} by ${meeting.book.author}\n📍 ${meeting.location}`
      : `Don't forget — book club is coming up! Tap to RSVP. 📚🍷\n\n📖 ${meeting.book.title} by ${meeting.book.author}\n📅 ${formatDate(meeting.date)} at ${formatTime(meeting.time)}\n📍 ${meeting.location}`

    const shareUrl = new URL(window.location.origin)
    if (meeting.book.coverUrl) {
      const raw = meeting.book.coverUrl
      const highRes = raw.includes("books.google.com")
        ? raw.replace(/&edge=curl/, "").replace(/zoom=\d+/, "zoom=5")
        : raw.replace(/-[SM]\.jpg$/, "-L.jpg")
      shareUrl.searchParams.set("ogImage", highRes)
    }

    if (!navigator.share) {
      await navigator.clipboard.writeText(`${text}\n${shareUrl}`).catch(() => {})
      setShareLabel("Copied!")
      setTimeout(() => setShareLabel("Share"), 2000)
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
    <>
      <BookDetailDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={meeting.book.title}
        author={meeting.book.author}
        coverUrl={meeting.book.coverUrl}
      />
    <Card className="overflow-hidden relative">
      {/* Delete Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10"
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
              onClick={() => setDetailOpen(true)}
            />
          </div>

          {/* Content */}
          <div className="flex-1 p-4 sm:pl-0 pr-10">
            <button
              type="button"
              className="text-left mb-4"
              onClick={() => setDetailOpen(true)}
            >
              <h3 className="font-serif text-xl font-semibold text-foreground">
                {meeting.book.title}
              </h3>
              <p className="text-muted-foreground">by {meeting.book.author}</p>
            </button>

            {/* Tappable meeting details */}
            <div className="flex flex-wrap gap-2 text-sm mb-4">
              {isPolling ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium">
                  <Vote className="h-4 w-4" />
                  Date poll open
                </span>
              ) : (
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  {formatDate(meeting.date)}
                </button>
              )}
              {!isPolling && (
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Clock className="h-4 w-4" />
                  {formatTime(meeting.time)}
                </button>
              )}
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                <MapPin className="h-4 w-4" />
                {meeting.location}
              </button>
            </div>

            {isPolling ? (
              /* Date Poll Section */
              <div className="border-t border-border pt-4">
                <DatePoll
                  options={meeting.dateOptions!}
                  userName={userName}
                  onToggleVote={onToggleDateVote}
                  onFinalize={onFinalizeDate}
                />
              </div>
            ) : (
              /* RSVP Section */
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
                  <div className="mt-3 text-sm space-y-1">
                    {(["yes", "maybe", "no"] as const).map((response) => {
                      const names = meeting.rsvps.filter(r => r.response === response).map(r => r.name)
                      if (names.length === 0) return null
                      const label = response === "yes" ? "Yes" : response === "maybe" ? "Maybe" : "No"
                      return (
                        <div key={response} className="text-muted-foreground">
                          <span className="font-medium text-foreground">{label}: </span>
                          {names.join(", ")}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Action bar */}
            <CardActionBar
              actions={[{ icon: Share2, label: shareLabel, onClick: handleShare }]}
            />
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  )
}
