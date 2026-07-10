import type { Meeting, SuggestedBook, Vote } from "@/lib/types"

// In-memory sample data for demo mode (?demo=1). Lets anyone play with the
// full app — voting, polls, RSVPs — without touching the real database.
// State lives only in this module, so a page refresh resets everything.

function isoDate(daysFromNow: number) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().slice(0, 10)
}

export const demoMeetings: Meeting[] = [
  {
    id: "demo-meeting-1",
    book: {
      id: "demo-book-1",
      title: "Tomorrow, and Tomorrow, and Tomorrow",
      author: "Gabrielle Zevin",
      coverUrl: "https://covers.openlibrary.org/b/title/Tomorrow%2C%20and%20Tomorrow%2C%20and%20Tomorrow-M.jpg",
    },
    date: isoDate(0),
    time: "19:00",
    location: "Emily's House",
    rsvps: [
      { name: "Emily", response: "yes" },
      { name: "Sarah", response: "yes" },
      { name: "Jess", response: "maybe" },
    ],
    suggestionId: "demo-sug-3",
  },
  {
    id: "demo-meeting-2",
    book: {
      id: "demo-book-2",
      title: "The Midnight Library",
      author: "Matt Haig",
      coverUrl: "https://covers.openlibrary.org/b/title/The%20Midnight%20Library-M.jpg",
    },
    date: "",
    time: "TBD",
    location: "Sarah's Patio",
    rsvps: [],
    dateOptions: [
      { id: "opt-1", date: isoDate(16), voters: ["Sarah", "Jess"] },
      { id: "opt-2", date: isoDate(17), voters: ["Sarah"] },
      { id: "opt-3", date: isoDate(23), voters: [] },
    ],
  },
  {
    id: "demo-meeting-past",
    book: {
      id: "demo-book-past",
      title: "Lessons in Chemistry",
      author: "Bonnie Garmus",
      coverUrl: "https://covers.openlibrary.org/b/title/Lessons%20in%20Chemistry-M.jpg",
    },
    date: isoDate(-40),
    time: "19:00",
    location: "Emily's House",
    rsvps: [
      { name: "Emily", response: "yes" },
      { name: "Sarah", response: "yes" },
    ],
  },
]

export const demoSuggestions: SuggestedBook[] = [
  {
    id: "demo-sug-1",
    title: "Remarkably Bright Creatures",
    author: "Shelby Van Pelt",
    coverUrl: "https://covers.openlibrary.org/b/title/Remarkably%20Bright%20Creatures-M.jpg",
    suggestedBy: "Jess",
    createdAt: "2026-07-01T12:00:00Z",
  },
  {
    id: "demo-sug-2",
    title: "The Seven Husbands of Evelyn Hugo",
    author: "Taylor Jenkins Reid",
    coverUrl: "https://covers.openlibrary.org/b/title/The%20Seven%20Husbands%20of%20Evelyn%20Hugo-M.jpg",
    suggestedBy: "Sarah",
    createdAt: "2026-07-03T12:00:00Z",
  },
  {
    // Scheduled suggestion: hidden from the Vote tab while its meeting
    // exists; deleting that meeting brings it back, votes intact.
    id: "demo-sug-3",
    title: "Tomorrow, and Tomorrow, and Tomorrow",
    author: "Gabrielle Zevin",
    coverUrl: "https://covers.openlibrary.org/b/title/Tomorrow%2C%20and%20Tomorrow%2C%20and%20Tomorrow-M.jpg",
    suggestedBy: "Emily",
    createdAt: "2026-06-20T12:00:00Z",
  },
]

export const demoVotes: Vote[] = [
  { bookId: "demo-sug-3", voterName: "Emily" },
  { bookId: "demo-sug-3", voterName: "Sarah" },
  { bookId: "demo-sug-3", voterName: "Jess" },
  { bookId: "demo-sug-1", voterName: "Jess" },
  { bookId: "demo-sug-1", voterName: "Emily" },
  { bookId: "demo-sug-2", voterName: "Sarah" },
]
