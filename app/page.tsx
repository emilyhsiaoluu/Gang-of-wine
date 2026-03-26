"use client"

import { useState } from "react"
import { WelcomeScreen } from "@/components/welcome-screen"
import { BookClubApp } from "@/components/book-club-app"

export default function Home() {
  const [userName, setUserName] = useState<string | null>(null)

  if (!userName) {
    return <WelcomeScreen onJoin={setUserName} />
  }

  return (
    <BookClubApp 
      userName={userName} 
      onEditName={() => setUserName(null)} 
    />
  )
}
