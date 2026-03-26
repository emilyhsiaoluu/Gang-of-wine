"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScheduleTab } from "@/components/tabs/schedule-tab"
import { SuggestTab } from "@/components/tabs/suggest-tab"
import { VoteTab } from "@/components/tabs/vote-tab"
import { ArchiveTab } from "@/components/tabs/archive-tab"
import { Wine, BookOpen, Calendar, Lightbulb, Heart, Archive } from "lucide-react"
import type { Meeting, SuggestedBook, Vote } from "@/lib/types"
import {
  addMeeting,
  addSuggestion,
  deleteMeeting,
  deleteSuggestion,
  fetchAppData,
  toggleVote,
  updateMeeting,
  upsertRsvp,
} from "@/lib/data"

interface BookClubAppProps {
  userName: string
  onEditName: () => void
}

export function BookClubApp({ userName, onEditName }: BookClubAppProps) {
  const getStartOfTodayMs = () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [suggestions, setSuggestions] = useState<SuggestedBook[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [activeTab, setActiveTab] = useState("schedule")
  const [todayStartMs, setTodayStartMs] = useState<number>(() => getStartOfTodayMs())
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const refreshData = useCallback(async () => {
    setErrorMessage(null)
    const data = await fetchAppData()
    setMeetings(data.meetings)
    setSuggestions(data.suggestions)
    setVotes(data.votes)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        await refreshData()
      } catch (error) {
        console.error("Failed loading app data:", error)
        setErrorMessage("Could not load book club data from Supabase.")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [refreshData])

  // Keep schedule/archive split accurate when the day changes (midnight).
  useEffect(() => {
    let timeoutId: number | null = null

    const scheduleTick = () => {
      const now = new Date()
      const next = new Date(now)
      next.setDate(now.getDate() + 1)
      next.setHours(0, 0, 0, 0)
      const msUntilNext = next.getTime() - now.getTime()

      timeoutId = window.setTimeout(() => {
        setTodayStartMs(getStartOfTodayMs())
        scheduleTick()
      }, msUntilNext)
    }

    scheduleTick()
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [])

  const { upcomingMeetings, pastMeetings } = useMemo(() => {
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

    const parseMeetingDate = (dateStr: string): Date | null => {
      if (!dateStr) return null

      // Handles "YYYY-MM-DD"
      if (dateStr.includes("-")) {
        const [y, m, d] = dateStr.split("-").map(Number)
        if (!y || !m || !d) return null
        return new Date(y, m - 1, d, 0, 0, 0, 0)
      }

      // Handles "March 13th" / "Friday, March 13th"
      const cleaned = dateStr.toLowerCase()
      const yearMatch = cleaned.match(/\b(19\d{2}|20\d{2})\b/)
      const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear()

      const monthMatch = cleaned.match(
        /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/,
      )
      const dayMatch = cleaned.match(/\b(\d{1,2})(st|nd|rd|th)?\b/)

      if (!monthMatch || !dayMatch) return null
      const month = monthIndex[monthMatch[1]]
      const day = Number(dayMatch[1])
      if (Number.isNaN(day) || month === undefined) return null

      return new Date(year, month, day, 0, 0, 0, 0)
    }

    const isPast = (dateStr: string) => {
      const d = parseMeetingDate(dateStr)
      if (!d) return false
      return d.getTime() < todayStartMs
    }

    const upcoming = meetings.filter((m) => !isPast(m.date))
    const past = meetings.filter((m) => isPast(m.date))

    return { upcomingMeetings: upcoming, pastMeetings: past }
  }, [meetings, todayStartMs])

  const handleAddMeeting = async (meeting: Omit<Meeting, "id" | "rsvps">) => {
    try {
      await addMeeting(meeting)
      await refreshData()
    } catch (error) {
      console.error("Failed adding meeting:", error)
      setErrorMessage("Could not add meeting. Please try again.")
    }
  }

  const handleRSVP = async (meetingId: string, response: "yes" | "no" | "maybe", rsvpName: string) => {
    try {
      await upsertRsvp(meetingId, response, rsvpName)
      await refreshData()
    } catch (error) {
      console.error("Failed updating RSVP:", error)
      setErrorMessage("Could not update RSVP. Please try again.")
    }
  }

  const handleSuggestBook = async (book: Omit<SuggestedBook, "id" | "suggestedBy">) => {
    try {
      await addSuggestion(book, userName)
      await refreshData()
    } catch (error) {
      console.error("Failed suggesting book:", error)
      setErrorMessage("Could not add book suggestion. Please try again.")
    }
  }

  const handleVote = async (bookId: string) => {
    try {
      await toggleVote(bookId, userName)
      await refreshData()
    } catch (error) {
      console.error("Failed toggling vote:", error)
      setErrorMessage("Could not update vote. Please try again.")
    }
  }

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await deleteMeeting(meetingId)
      await refreshData()
    } catch (error) {
      console.error("Failed deleting meeting:", error)
      setErrorMessage("Could not delete meeting. Please try again.")
    }
  }

  const handleUpdateMeeting = async (meetingId: string, updates: Partial<Omit<Meeting, "id" | "rsvps" | "book">>) => {
    try {
      await updateMeeting(meetingId, updates)
      await refreshData()
    } catch (error) {
      console.error("Failed updating meeting:", error)
      setErrorMessage("Could not save meeting changes. Please try again.")
    }
  }

  const handleDeleteSuggestion = async (bookId: string) => {
    try {
      await deleteSuggestion(bookId)
      await refreshData()
    } catch (error) {
      console.error("Failed deleting suggestion:", error)
      setErrorMessage("Could not delete suggestion. Please try again.")
    }
  }

  const handleScheduleFromVote = (book: SuggestedBook) => {
    setActiveTab("schedule")
    // Pass the book data to schedule tab via a temporary state
    setScheduleFormBook(book)
  }

  const [scheduleFormBook, setScheduleFormBook] = useState<SuggestedBook | null>(null)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <p className="text-muted-foreground">Loading your book club data...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wine className="h-6 w-6 text-primary" />
            <BookOpen className="h-6 w-6 text-accent" />
            <span className="font-serif text-lg font-semibold text-foreground hidden sm:inline">
              Wine Moms Book Club
            </span>
          </div>
          <button
            onClick={onEditName}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/15"
          >
            {userName}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {errorMessage && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 h-auto p-1 bg-muted">
            <TabsTrigger 
              value="schedule" 
              className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-card data-[state=active]:text-primary"
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs font-medium text-center leading-tight">RSVP</span>
            </TabsTrigger>
            <TabsTrigger 
              value="suggest" 
              className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-card data-[state=active]:text-primary"
            >
              <Lightbulb className="h-5 w-5" />
              <span className="text-xs font-medium">Suggest</span>
            </TabsTrigger>
            <TabsTrigger 
              value="vote" 
              className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-card data-[state=active]:text-primary"
            >
              <Heart className="h-5 w-5" />
              <span className="text-xs font-medium">Vote</span>
            </TabsTrigger>
            <TabsTrigger 
              value="archive" 
              className="flex flex-col items-center gap-1 py-3 data-[state=active]:bg-card data-[state=active]:text-primary"
            >
              <Archive className="h-5 w-5" />
              <span className="text-xs font-medium">Archive</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="mt-0">
            <ScheduleTab 
              meetings={upcomingMeetings} 
              userName={userName}
              onAddMeeting={handleAddMeeting}
              onRSVP={handleRSVP}
              onDeleteMeeting={handleDeleteMeeting}
              onUpdateMeeting={handleUpdateMeeting}
              prefillBook={scheduleFormBook}
              onPrefillUsed={() => setScheduleFormBook(null)}
            />
          </TabsContent>

          <TabsContent value="suggest" className="mt-0">
            <SuggestTab 
              suggestions={suggestions}
              onSuggest={handleSuggestBook}
              onDelete={handleDeleteSuggestion}
            />
          </TabsContent>

          <TabsContent value="vote" className="mt-0">
            <VoteTab 
              suggestions={suggestions}
              votes={votes}
              userName={userName}
              onVote={handleVote}
              onScheduleMeeting={handleScheduleFromVote}
            />
          </TabsContent>

          <TabsContent value="archive" className="mt-0">
            <ArchiveTab archive={pastMeetings} onDeleteMeeting={handleDeleteMeeting} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
