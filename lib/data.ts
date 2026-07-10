"use client"

import type { DateOption, Meeting, RSVP, SuggestedBook, Vote } from "@/lib/types"
import { getSupabaseClient } from "@/lib/supabase"
import { demoMeetings, demoSuggestions, demoVotes } from "@/lib/demo-data"

// Demo mode (?demo=1): all reads/writes hit an in-memory copy of sample data
// instead of Supabase, so the UI can be exercised without touching real data.
// Refreshing the page resets it.
const isDemoMode = () =>
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo")

let demoState: { meetings: Meeting[]; suggestions: SuggestedBook[]; votes: Vote[] } | null = null

function getDemoState() {
  if (!demoState) {
    demoState = {
      meetings: JSON.parse(JSON.stringify(demoMeetings)),
      suggestions: JSON.parse(JSON.stringify(demoSuggestions)),
      votes: JSON.parse(JSON.stringify(demoVotes)),
    }
  }
  return demoState!
}

type SuggestionRow = {
  id: string
  title: string
  author: string
  description: string | null
  cover_url: string | null
  suggested_by: string
  created_at: string
}

type VoteRow = {
  suggestion_id: string
  voter_name: string
}

type MeetingRow = {
  id: string
  book_title: string
  book_author: string
  book_cover_url: string | null
  date: string | null
  time: string
  location: string
  wine_theme: string | null
  date_options?: DateOption[] | null
}

type MeetingRsvpRow = {
  meeting_id: string
  rsvp_name: string
  response: "yes" | "no" | "maybe"
}

type AppData = {
  meetings: Meeting[]
  suggestions: SuggestedBook[]
  votes: Vote[]
}

function mapSuggestion(row: SuggestionRow): SuggestedBook {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    description: row.description ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    suggestedBy: row.suggested_by,
    createdAt: row.created_at,
  }
}

function mapVote(row: VoteRow): Vote {
  return {
    bookId: row.suggestion_id,
    voterName: row.voter_name,
  }
}

function mapRsvp(row: MeetingRsvpRow): RSVP {
  return {
    name: row.rsvp_name,
    response: row.response,
  }
}

export async function fetchAppData(): Promise<AppData> {
  if (isDemoMode()) {
    const state = getDemoState()
    return JSON.parse(JSON.stringify(state))
  }
  const supabase = getSupabaseClient()
  const [suggestionsRes, votesRes, meetingsRes, rsvpsRes] = await Promise.all([
    supabase.from("suggestions").select("*").order("created_at", { ascending: true }),
    supabase.from("votes").select("*"),
    supabase.from("meetings").select("*").order("date", { ascending: true }),
    supabase.from("meeting_rsvps").select("*"),
  ])

  if (suggestionsRes.error) throw suggestionsRes.error
  if (votesRes.error) throw votesRes.error
  if (meetingsRes.error) throw meetingsRes.error
  if (rsvpsRes.error) throw rsvpsRes.error

  const suggestions = (suggestionsRes.data as SuggestionRow[]).map(mapSuggestion)
  const votes = (votesRes.data as VoteRow[]).map(mapVote)
  const rsvpsByMeeting = new Map<string, RSVP[]>()

  for (const row of rsvpsRes.data as MeetingRsvpRow[]) {
    const existing = rsvpsByMeeting.get(row.meeting_id) ?? []
    existing.push(mapRsvp(row))
    rsvpsByMeeting.set(row.meeting_id, existing)
  }

  const meetings = (meetingsRes.data as MeetingRow[]).map((row) => ({
    id: row.id,
    book: {
      id: `book-${row.id}`,
      title: row.book_title,
      author: row.book_author,
      coverUrl: row.book_cover_url ?? undefined,
    },
    date: row.date ?? "",
    time: row.time,
    location: row.location,
    rsvps: rsvpsByMeeting.get(row.id) ?? [],
    wineTheme: row.wine_theme ?? undefined,
    dateOptions: row.date_options ?? undefined,
  }))

  return { meetings, suggestions, votes }
}

export async function addSuggestion(input: Omit<SuggestedBook, "id" | "suggestedBy">, userName: string) {
  if (isDemoMode()) {
    getDemoState().suggestions.push({
      ...input,
      id: `demo-sug-${Date.now()}`,
      suggestedBy: userName,
      createdAt: new Date().toISOString(),
    })
    return
  }
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("suggestions").insert({
    title: input.title,
    author: input.author,
    description: input.description ?? null,
    cover_url: input.coverUrl ?? null,
    suggested_by: userName,
  })
  if (error) throw error
}

export async function deleteSuggestion(bookId: string) {
  if (isDemoMode()) {
    const state = getDemoState()
    state.suggestions = state.suggestions.filter((s) => s.id !== bookId)
    state.votes = state.votes.filter((v) => v.bookId !== bookId)
    return
  }
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("suggestions").delete().eq("id", bookId)
  if (error) throw error
}

export async function toggleVote(bookId: string, voterName: string) {
  if (isDemoMode()) {
    const state = getDemoState()
    const existing = state.votes.findIndex((v) => v.bookId === bookId && v.voterName === voterName)
    if (existing >= 0) state.votes.splice(existing, 1)
    else state.votes.push({ bookId, voterName })
    return
  }
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("votes")
    .select("suggestion_id,voter_name")
    .eq("suggestion_id", bookId)
    .eq("voter_name", voterName)
    .maybeSingle()

  if (error) throw error

  if (data) {
    const { error: deleteError } = await supabase
      .from("votes")
      .delete()
      .eq("suggestion_id", bookId)
      .eq("voter_name", voterName)
    if (deleteError) throw deleteError
    return
  }

  const { error: insertError } = await supabase.from("votes").insert({
    suggestion_id: bookId,
    voter_name: voterName,
  })
  if (insertError) throw insertError
}

export async function addMeeting(meeting: Omit<Meeting, "id" | "rsvps">) {
  if (isDemoMode()) {
    getDemoState().meetings.push({ ...meeting, id: `demo-meeting-${Date.now()}`, rsvps: [] })
    return
  }
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("meetings").insert({
    book_title: meeting.book.title,
    book_author: meeting.book.author,
    book_cover_url: meeting.book.coverUrl ?? null,
    date: meeting.date || null,
    time: meeting.time,
    location: meeting.location,
    wine_theme: meeting.wineTheme ?? null,
    date_options: meeting.dateOptions ?? null,
  })
  if (error) throw error
}

export async function toggleDateVote(meetingId: string, optionId: string, voterName: string) {
  if (isDemoMode()) {
    const meeting = getDemoState().meetings.find((m) => m.id === meetingId)
    const option = meeting?.dateOptions?.find((o) => o.id === optionId)
    if (!option) return
    option.voters = option.voters.includes(voterName)
      ? option.voters.filter((v) => v !== voterName)
      : [...option.voters, voterName]
    return
  }
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("meetings")
    .select("date_options")
    .eq("id", meetingId)
    .single()
  if (error) throw error

  const options = (data?.date_options ?? []) as DateOption[]
  const updated = options.map((opt) => {
    if (opt.id !== optionId) return opt
    const voters = opt.voters.includes(voterName)
      ? opt.voters.filter((v) => v !== voterName)
      : [...opt.voters, voterName]
    return { ...opt, voters }
  })

  const { error: updateError } = await supabase
    .from("meetings")
    .update({ date_options: updated })
    .eq("id", meetingId)
  if (updateError) throw updateError
}

export async function finalizeMeetingDate(meetingId: string, date: string) {
  // Options (and everyone's availability votes) are kept so the poll can be
  // reopened later if the locked-in date stops working.
  if (isDemoMode()) {
    const meeting = getDemoState().meetings.find((m) => m.id === meetingId)
    if (meeting) meeting.date = date
    return
  }
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("meetings").update({ date }).eq("id", meetingId)
  if (error) throw error
}

export async function reopenDatePoll(meetingId: string) {
  // Clearing the date flips the meeting back into polling mode; the previous
  // options and votes are still there for people to adjust.
  if (isDemoMode()) {
    const meeting = getDemoState().meetings.find((m) => m.id === meetingId)
    if (meeting) meeting.date = ""
    return
  }
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("meetings").update({ date: null }).eq("id", meetingId)
  if (error) throw error
}

export async function updateMeeting(
  meetingId: string,
  updates: Partial<Omit<Meeting, "id" | "rsvps" | "book">>,
) {
  if (isDemoMode()) {
    const meeting = getDemoState().meetings.find((m) => m.id === meetingId)
    if (meeting) Object.assign(meeting, updates)
    return
  }
  const supabase = getSupabaseClient()
  const payload: Record<string, string> = {}
  if (updates.date !== undefined) payload.date = updates.date
  if (updates.time !== undefined) payload.time = updates.time
  if (updates.location !== undefined) payload.location = updates.location
  if (updates.wineTheme !== undefined) payload.wine_theme = updates.wineTheme

  const { error } = await supabase.from("meetings").update(payload).eq("id", meetingId)
  if (error) throw error
}

export async function deleteMeeting(meetingId: string) {
  if (isDemoMode()) {
    const state = getDemoState()
    state.meetings = state.meetings.filter((m) => m.id !== meetingId)
    return
  }
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("meetings").delete().eq("id", meetingId)
  if (error) throw error
}

export async function upsertRsvp(
  meetingId: string,
  response: "yes" | "no" | "maybe",
  rsvpName: string,
) {
  if (isDemoMode()) {
    const meeting = getDemoState().meetings.find((m) => m.id === meetingId)
    if (!meeting) return
    const existing = meeting.rsvps.find((r) => r.name === rsvpName)
    if (existing) existing.response = response
    else meeting.rsvps.push({ name: rsvpName, response })
    return
  }
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("meeting_rsvps").upsert(
    {
      meeting_id: meetingId,
      rsvp_name: rsvpName,
      response,
    },
    { onConflict: "meeting_id,rsvp_name" },
  )
  if (error) throw error
}
