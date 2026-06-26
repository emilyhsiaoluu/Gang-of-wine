"use client"

import type { Meeting, RSVP, SuggestedBook, Vote } from "@/lib/types"
import { getSupabaseClient } from "@/lib/supabase"

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
  date: string
  time: string
  location: string
  wine_theme: string | null
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
    date: row.date,
    time: row.time,
    location: row.location,
    rsvps: rsvpsByMeeting.get(row.id) ?? [],
    wineTheme: row.wine_theme ?? undefined,
  }))

  return { meetings, suggestions, votes }
}

export async function addSuggestion(input: Omit<SuggestedBook, "id" | "suggestedBy">, userName: string) {
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
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("suggestions").delete().eq("id", bookId)
  if (error) throw error
}

export async function toggleVote(bookId: string, voterName: string) {
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
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("meetings").insert({
    book_title: meeting.book.title,
    book_author: meeting.book.author,
    book_cover_url: meeting.book.coverUrl ?? null,
    date: meeting.date,
    time: meeting.time,
    location: meeting.location,
    wine_theme: meeting.wineTheme ?? null,
  })
  if (error) throw error
}

export async function updateMeeting(
  meetingId: string,
  updates: Partial<Omit<Meeting, "id" | "rsvps" | "book">>,
) {
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
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("meetings").delete().eq("id", meetingId)
  if (error) throw error
}

export async function upsertRsvp(
  meetingId: string,
  response: "yes" | "no" | "maybe",
  rsvpName: string,
) {
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
