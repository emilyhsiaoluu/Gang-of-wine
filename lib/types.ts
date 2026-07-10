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
}

export interface SuggestedBook extends Book {
  suggestedBy: string
  createdAt?: string
}

export interface Vote {
  bookId: string
  voterName: string
}
