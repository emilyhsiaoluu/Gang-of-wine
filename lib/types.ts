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

export interface Meeting {
  id: string
  book: Book
  date: string
  time: string
  location: string
  rsvps: RSVP[]
  wineTheme?: string
}

export interface SuggestedBook extends Book {
  suggestedBy: string
}

export interface Vote {
  bookId: string
  voterName: string
}
