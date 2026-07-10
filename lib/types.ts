export interface Book {
  id: string
  title: string
  author: string
  description?: string
  coverUrl?: string
  suggestedBy?: string
  rating?: number
}

export interface RSVP {
  name: string
  response: "yes" | "no" | "maybe"
}

export interface DateOption {
  id: string
  date: string
  voters: string[]
}

export interface Meeting {
  id: string
  book: Book
  date: string
  time: string
  location: string
  rsvps: RSVP[]
  wineTheme?: string
  dateOptions?: DateOption[]
  /** Set when the meeting was scheduled from a Vote-tab suggestion; deleting
   *  the meeting returns that suggestion (votes intact) to the Vote tab. */
  suggestionId?: string
}

export interface SuggestedBook extends Book {
  suggestedBy: string
  createdAt?: string
}

export interface Vote {
  bookId: string
  voterName: string
}
